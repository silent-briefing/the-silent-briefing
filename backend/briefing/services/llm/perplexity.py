from __future__ import annotations

import base64
import json
import struct
from typing import Any

import httpx

from briefing.config import Settings, get_settings


def _decode_int8_embedding(b64: str, *, dimensions: int) -> list[float]:
    raw = base64.b64decode(b64)
    if len(raw) != dimensions:
        msg = f"Embedding byte length {len(raw)} != dimensions {dimensions}"
        raise ValueError(msg)
    fmt = f"{dimensions}b"
    ints = struct.unpack(fmt, raw)
    return [float(x) / 127.0 for x in ints]


class PerplexityLLMService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._s = settings or get_settings()
        if not self._s.perplexity_api_key:
            msg = "PERPLEXITY_API_KEY is required for PerplexityLLMService"
            raise ValueError(msg)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        cleaned = [t.strip() for t in texts if t.strip()]
        if not cleaned:
            return []
        out_vectors: list[list[float]] = []
        base = self._s.perplexity_base_url.rstrip("/")
        dim = self._s.embedding_dimensions
        headers = {
            "Authorization": f"Bearer {self._s.perplexity_api_key}",
            "Content-Type": "application/json",
        }
        with httpx.Client(timeout=120.0) as client:
            for i in range(0, len(cleaned), 32):
                batch = cleaned[i : i + 32]
                body: dict[str, Any] = {
                    "model": self._s.embedding_model_id,
                    "input": batch,
                    "dimensions": dim,
                }
                resp = client.post(f"{base}/v1/embeddings", headers=headers, json=body)
                resp.raise_for_status()
                data = resp.json()
                items = sorted(data["data"], key=lambda x: x["index"])
                for item in items:
                    b64 = item["embedding"]
                    if not isinstance(b64, str):
                        msg = "Unexpected embedding format from Perplexity API"
                        raise RuntimeError(msg)
                    out_vectors.append(_decode_int8_embedding(b64, dimensions=dim))
        return out_vectors

    def chat_completion(
        self,
        *,
        messages: list[dict[str, Any]],
        model: str | None = None,
        response_format: dict[str, Any] | None = None,
        temperature: float = 0.2,
    ) -> str:
        base = self._s.perplexity_base_url.rstrip("/")
        mid = model or self._s.writer_model
        body: dict[str, Any] = {
            "model": mid,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format is not None:
            body["response_format"] = response_format
        headers = {
            "Authorization": f"Bearer {self._s.perplexity_api_key}",
            "Content-Type": "application/json",
        }
        with httpx.Client(timeout=180.0) as client:
            resp = client.post(f"{base}/v1/sonar", headers=headers, json=body)
            resp.raise_for_status()
            payload = resp.json()
        try:
            return payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            msg = f"Malformed chat/completions response: {json.dumps(payload)[:500]}"
            raise RuntimeError(msg) from e
