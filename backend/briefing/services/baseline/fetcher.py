from __future__ import annotations

import random
import time
import httpx


def resilient_get_text(
    url: str,
    *,
    user_agent: str,
    timeout: float = 60.0,
    max_retries: int = 4,
) -> str:
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    last_err: Exception | None = None
    for attempt in range(max_retries):
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True, headers=headers) as client:
                resp = client.get(url)
                if resp.status_code == 429:
                    ra = resp.headers.get("Retry-After")
                    delay = float(ra) if ra and ra.isdigit() else 2.0 * (attempt + 1)
                    time.sleep(delay + random.uniform(0, 0.5))
                    continue
                resp.raise_for_status()
                return resp.text
        except Exception as e:
            last_err = e
            time.sleep(0.4 * (2**attempt) + random.uniform(0, 0.3))
    msg = f"GET {url} failed after {max_retries} attempts"
    raise RuntimeError(msg) from last_err


def maybe_write_artifact(path: str | None, name: str, body: str) -> None:
    if not path:
        return
    from pathlib import Path

    d = Path(path)
    d.mkdir(parents=True, exist_ok=True)
    (d / name).write_text(body, encoding="utf-8")
