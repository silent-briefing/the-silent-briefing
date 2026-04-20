from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class LLMService(Protocol):
    """Sonar-family Perplexity surface: embeddings + chat completions."""

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Return one float vector per input (cosine-ready; same length as settings.embedding_dimensions)."""
        ...

    def chat_completion(
        self,
        *,
        messages: list[dict[str, Any]],
        model: str | None = None,
        response_format: dict[str, Any] | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Return assistant message content (plain text or JSON string if caller requests json_schema)."""
        ...
