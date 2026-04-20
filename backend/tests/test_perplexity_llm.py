from __future__ import annotations

import base64

import httpx
import pytest
import respx

from briefing.config import Settings
from briefing.services.llm.perplexity import PerplexityLLMService


@pytest.fixture
def ppl_settings() -> Settings:
    return Settings(
        perplexity_api_key="test-key",
        perplexity_base_url="https://api.perplexity.ai",
        embedding_model_id="pplx-embed-v1-0.6b",
        embedding_dimensions=1024,
        writer_model="sonar-pro",
    )


@respx.mock
def test_embed_texts_decodes_int8_base64(ppl_settings: Settings) -> None:
    raw = bytes([0] * 1024)
    b64 = base64.b64encode(raw).decode()
    body = {
        "object": "list",
        "data": [{"object": "embedding", "index": 0, "embedding": b64}],
        "model": "pplx-embed-v1-0.6b",
    }
    respx.post("https://api.perplexity.ai/v1/embeddings").mock(
        return_value=httpx.Response(200, json=body)
    )
    llm = PerplexityLLMService(ppl_settings)
    out = llm.embed_texts(["hello world"])
    assert len(out) == 1
    assert len(out[0]) == 1024
    assert out[0][0] == 0.0


@respx.mock
def test_chat_completion_returns_assistant_content(ppl_settings: Settings) -> None:
    body = {"choices": [{"message": {"content": '{"sources":[]}'}}]}
    respx.post("https://api.perplexity.ai/v1/sonar").mock(
        return_value=httpx.Response(200, json=body)
    )
    llm = PerplexityLLMService(ppl_settings)
    text = llm.chat_completion(
        messages=[{"role": "user", "content": "Return minimal JSON."}],
    )
    assert text == '{"sources":[]}'
