"""Utah Supreme Court published opinions (legacy PDF index) → text chunks → rag_chunks."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from io import BytesIO
from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader

from briefing.config import Settings, get_settings
from briefing.services.extraction.judicial import fetch_sup_html
from briefing.services.llm.perplexity import PerplexityLLMService

UT_SUPREME_OPINION_INDEX = "https://legacy.utcourts.gov/opinions/supopin/"
SOURCE_TYPE = "ut_supreme_opinion"
_CHUNK_TARGET_CHARS = 3600
_CHUNK_OVERLAP = 400


@dataclass(frozen=True)
class OpinionRef:
    case_name: str
    pdf_url: str
    filed_yyyymmdd: str | None


_DATE_SUFFIX = re.compile(r"(\d{8})\.pdf$", re.IGNORECASE)


def list_ut_supreme_opinion_pdfs(
    *,
    limit: int,
    user_agent: str,
    index_url: str = UT_SUPREME_OPINION_INDEX,
) -> list[OpinionRef]:
    html = fetch_sup_html(index_url, user_agent)
    soup = BeautifulSoup(html, "lxml")
    seen: set[str] = set()
    out: list[OpinionRef] = []
    for a in soup.find_all("a", href=True):
        href = urljoin(index_url, a["href"])
        if "/summaries/" in href:
            continue
        if "/opinions/supopin/" not in href:
            continue
        if not href.lower().endswith(".pdf"):
            continue
        m = _DATE_SUFFIX.search(href)
        if not m:
            continue
        filed = m.group(1)
        if href in seen:
            continue
        label = a.get_text(" ", strip=True)
        if not label or label.lower().startswith("summary of"):
            continue
        seen.add(href)
        out.append(OpinionRef(case_name=label, pdf_url=href, filed_yyyymmdd=filed))
        if len(out) >= limit:
            break
    return out


def validate_golden_opinion_index(refs: list[OpinionRef]) -> None:
    if len(refs) < 3:
        msg = f"Golden check: expected at least 3 supreme court opinion PDFs, got {len(refs)}"
        raise RuntimeError(msg)


def validate_golden_opinion_chunks(total_chunks: int) -> None:
    if total_chunks < 3:
        msg = f"Golden check: expected chunks from >=3 opinions (total chunks {total_chunks})"
        raise RuntimeError(msg)


def download_pdf_bytes(url: str, user_agent: str) -> bytes:
    headers = {
        "User-Agent": user_agent,
        "Accept": "application/pdf,*/*;q=0.8",
    }
    with httpx.Client(timeout=120.0, follow_redirects=True, headers=headers) as client:
        r = client.get(url)
        r.raise_for_status()
        return r.content


def extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text() or ""
        if t.strip():
            parts.append(t)
    return "\n\n".join(parts).strip()


def chunk_text(text: str, *, max_chars: int, overlap: int) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return []
    chunks: list[str] = []
    i = 0
    n = len(text)
    while i < n:
        end = min(i + max_chars, n)
        piece = text[i:end].strip()
        if piece:
            chunks.append(piece)
        if end >= n:
            break
        i = end - overlap if end - overlap > i else end
    return chunks


def _content_hash(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _delete_chunks_for_source(client: Any, source_url: str) -> None:
    res = client.table("rag_chunks").select("id").eq("source_url", source_url).execute()
    for row in res.data or []:
        client.table("rag_chunks").delete().eq("id", row["id"]).execute()


def persist_opinion_chunks(
    ref: OpinionRef,
    chunks: list[str],
    embeddings: list[list[float]] | None,
    embedding_model_id: str | None,
    settings: Settings,
) -> int:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        msg = "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for persist"
        raise RuntimeError(msg)
    if embeddings is not None and len(embeddings) != len(chunks):
        msg = "embeddings length must match chunks"
        raise ValueError(msg)
    from supabase import create_client

    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    _delete_chunks_for_source(client, ref.pdf_url)
    inserted = 0
    for idx, content in enumerate(chunks):
        row: dict[str, Any] = {
            "content": content,
            "source_url": ref.pdf_url,
            "source_type": SOURCE_TYPE,
            "chunk_index": idx,
            "content_hash": _content_hash(content),
            "embedding_model_id": embedding_model_id,
            "metadata": {
                "case_name": ref.case_name,
                "filed_yyyymmdd": ref.filed_yyyymmdd,
                "court": "ut_supreme",
            },
        }
        if embeddings:
            row["embedding"] = embeddings[idx]
        client.table("rag_chunks").insert(row).execute()
        inserted += 1
    return inserted


def run_opinion_ingestion(
    *,
    limit: int = 3,
    persist: bool = False,
    dry_run: bool = False,
    embed: bool = True,
    settings: Settings | None = None,
) -> tuple[list[OpinionRef], int, int]:
    """Return (refs, total_chunks, rows_persisted)."""
    cfg = settings or get_settings()
    refs = list_ut_supreme_opinion_pdfs(limit=limit, user_agent=cfg.http_user_agent)
    validate_golden_opinion_index(refs)

    llm: PerplexityLLMService | None = None
    if embed and not dry_run:
        llm = PerplexityLLMService(cfg)

    total_chunks = 0
    opinions_with_chunks = 0
    persisted = 0
    for ref in refs:
        try:
            data = download_pdf_bytes(ref.pdf_url, cfg.http_user_agent)
            text = extract_pdf_text(data)
        except Exception:
            continue
        chunks = chunk_text(
            text, max_chars=_CHUNK_TARGET_CHARS, overlap=_CHUNK_OVERLAP
        )
        if not chunks:
            continue
        opinions_with_chunks += 1
        total_chunks += len(chunks)
        if dry_run:
            continue
        vectors: list[list[float]] | None = None
        if embed and llm is not None:
            vectors = llm.embed_texts(chunks)
        if persist:
            persisted += persist_opinion_chunks(
                ref,
                chunks,
                vectors,
                cfg.embedding_model_id if embed else None,
                cfg,
            )

    if opinions_with_chunks < 3:
        msg = (
            f"Expected PDF text from at least 3 opinions; got {opinions_with_chunks}. "
            "Site layout or PDF encoding may have changed."
        )
        raise RuntimeError(msg)
    validate_golden_opinion_chunks(total_chunks)
    return refs, total_chunks, persisted
