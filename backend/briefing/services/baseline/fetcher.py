from __future__ import annotations

import hashlib
import json
import random
import threading
import time
from dataclasses import dataclass
from pathlib import Path

import httpx


@dataclass(frozen=True)
class FetchedBody:
    """Result of a conditional GET with optional disk cache (ETag / body hash)."""

    text: str
    etag: str | None
    body_sha256: str


class ResilientFetcher:
    """HTTP GET with retries, optional If-None-Match + body cache, and a concurrency cap.

    When ``artifacts_dir`` is set, responses are keyed by SHA256(url); ETag and bodies
    are stored under ``.fetch_catalog/`` for 304 replay and change detection (body hash).
    """

    def __init__(
        self,
        *,
        user_agent: str,
        timeout: float = 60.0,
        max_retries: int = 4,
        artifacts_dir: str | None = None,
        max_concurrent: int = 8,
    ) -> None:
        self._user_agent = user_agent
        self._timeout = timeout
        self._max_retries = max_retries
        self._root: Path | None = (
            Path(artifacts_dir).expanduser().resolve() / ".fetch_catalog"
            if artifacts_dir
            else None
        )
        self._sem = threading.BoundedSemaphore(max(1, max_concurrent))

    def _url_key(self, url: str) -> str:
        return hashlib.sha256(url.encode("utf-8")).hexdigest()

    def _meta_path(self, url: str) -> Path | None:
        if self._root is None:
            return None
        return self._root / "meta" / f"{self._url_key(url)}.json"

    def _body_path(self, url: str) -> Path | None:
        if self._root is None:
            return None
        return self._root / "bodies" / f"{self._url_key(url)}.txt"

    def _read_meta(self, url: str) -> dict[str, str]:
        p = self._meta_path(url)
        if not p or not p.is_file():
            return {}
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        return raw if isinstance(raw, dict) else {}

    def _write_cache(self, url: str, text: str, etag: str | None) -> FetchedBody:
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if self._root is not None:
            self._root.mkdir(parents=True, exist_ok=True)
            bp = self._body_path(url)
            mp = self._meta_path(url)
            if bp and mp:
                bp.parent.mkdir(parents=True, exist_ok=True)
                mp.parent.mkdir(parents=True, exist_ok=True)
                bp.write_text(text, encoding="utf-8")
                mp.write_text(
                    json.dumps({"etag": etag, "sha256": digest}, indent=2),
                    encoding="utf-8",
                )
        return FetchedBody(text=text, etag=etag, body_sha256=digest)

    def get(self, url: str) -> FetchedBody:
        """GET url; use cached ETag/body when ``artifacts_dir`` is configured."""
        with self._sem:
            return self._get_unlocked(url)

    def get_text(self, url: str) -> str:
        return self.get(url).text

    def _get_unlocked(self, url: str) -> FetchedBody:
        meta = self._read_meta(url)
        cached_etag = meta.get("etag") if isinstance(meta.get("etag"), str) else None
        last_attempt_without_inm = False

        headers_base = {
            "User-Agent": self._user_agent,
            "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        last_err: Exception | None = None
        for attempt in range(self._max_retries):
            headers = dict(headers_base)
            if cached_etag and not last_attempt_without_inm:
                headers["If-None-Match"] = cached_etag
            try:
                with httpx.Client(
                    timeout=self._timeout, follow_redirects=True, headers=headers
                ) as client:
                    resp = client.get(url)
                    if resp.status_code == 429:
                        ra = resp.headers.get("Retry-After")
                        delay = float(ra) if ra and ra.isdigit() else 2.0 * (attempt + 1)
                        time.sleep(delay + random.uniform(0, 0.5))
                        continue
                    if resp.status_code == 304:
                        bp = self._body_path(url)
                        if bp and bp.is_file():
                            text = bp.read_text(encoding="utf-8")
                            return FetchedBody(
                                text=text,
                                etag=cached_etag,
                                body_sha256=hashlib.sha256(
                                    text.encode("utf-8")
                                ).hexdigest(),
                            )
                        cached_etag = None
                        last_attempt_without_inm = True
                        continue
                    resp.raise_for_status()
                    etag = resp.headers.get("ETag")
                    text = resp.text
                    return self._write_cache(url, text, etag)
            except Exception as e:
                last_err = e
                time.sleep(0.4 * (2**attempt) + random.uniform(0, 0.3))
        msg = f"GET {url} failed after {self._max_retries} attempts"
        raise RuntimeError(msg) from last_err


def resilient_get_text(
    url: str,
    *,
    user_agent: str,
    timeout: float = 60.0,
    max_retries: int = 4,
    artifacts_dir: str | None = None,
    max_concurrent: int = 8,
) -> str:
    """Backward-compatible helper; forwards to :class:`ResilientFetcher`."""
    return ResilientFetcher(
        user_agent=user_agent,
        timeout=timeout,
        max_retries=max_retries,
        artifacts_dir=artifacts_dir,
        max_concurrent=max_concurrent,
    ).get_text(url)


def maybe_write_artifact(path: str | None, name: str, body: str) -> None:
    if not path:
        return
    d = Path(path)
    d.mkdir(parents=True, exist_ok=True)
    (d / name).write_text(body, encoding="utf-8")
