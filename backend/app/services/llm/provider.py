import os
from app.core.config import settings
from app.services.llm.base import BaseLLMProvider, BaseEmbeddingProvider
from app.services.llm.gemini import GeminiLLMProvider, GeminiEmbeddingProvider
from app.services.llm.openai import OpenAILLMProvider, OpenAIEmbeddingProvider
from app.services.llm.mock import MockLLMProvider, LocalSentenceEmbeddingProvider

class SafeLLMProvider(BaseLLMProvider):
    def __init__(self):
        self.primary_provider = None
        self.used_fallback = False
        if settings.OPENAI_API_KEY:
            try:
                self.primary_provider = OpenAILLMProvider(settings.OPENAI_API_KEY)
            except Exception:
                pass
        elif settings.GEMINI_API_KEY:
            try:
                self.primary_provider = GeminiLLMProvider(settings.GEMINI_API_KEY)
            except Exception:
                pass
        self.fallback = MockLLMProvider()

    async def generate_response(self, prompt: str, system_instruction: str = "") -> str:
        if self.primary_provider:
            try:
                res = await self.primary_provider.generate_response(prompt, system_instruction)
                self.used_fallback = False
                return res
            except Exception as e:
                print(f"[LLM] Primary provider error ({e}), falling back to local extractor.")
        self.used_fallback = True
        return await self.fallback.generate_response(prompt, system_instruction)


class SafeEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self):
        self.primary_provider = None
        if settings.OPENAI_API_KEY:
            try:
                self.primary_provider = OpenAIEmbeddingProvider(settings.OPENAI_API_KEY)
            except Exception:
                pass
        elif settings.GEMINI_API_KEY:
            try:
                self.primary_provider = GeminiEmbeddingProvider(settings.GEMINI_API_KEY)
            except Exception:
                pass
        self.fallback = LocalSentenceEmbeddingProvider()

    def embed_texts(self, texts: list) -> list:
        if self.primary_provider:
            try:
                return self.primary_provider.embed_texts(texts)
            except Exception as e:
                print(f"[Embedding] Primary provider error ({e}), falling back to local embedder.")
        return self.fallback.embed_texts(texts)

    def embed_query(self, query: str) -> list:
        if self.primary_provider:
            try:
                return self.primary_provider.embed_query(query)
            except Exception as e:
                print(f"[Embedding] Primary query error ({e}), falling back to local embedder.")
        return self.fallback.embed_query(query)


def get_llm_provider() -> BaseLLMProvider:
    return SafeLLMProvider()

def get_embedding_provider() -> BaseEmbeddingProvider:
    return SafeEmbeddingProvider()
