import os
import logging
from app.core.config import settings
from app.services.llm.base import BaseLLMProvider, BaseEmbeddingProvider
from app.services.llm.gemini import GeminiLLMProvider, GeminiEmbeddingProvider
from app.services.llm.openai import OpenAILLMProvider, OpenAIEmbeddingProvider
from app.services.llm.mock import MockLLMProvider, LocalSentenceEmbeddingProvider

logger = logging.getLogger("omniagent")

class SafeLLMProvider(BaseLLMProvider):
    def __init__(self):
        self.primary_provider = None
        self.used_fallback = False
        self._fallback = None
        if settings.OPENAI_API_KEY:
            try:
                self.primary_provider = OpenAILLMProvider(settings.OPENAI_API_KEY)
            except Exception as e:
                logger.warning(f"[LLM] Failed to initialize OpenAI provider: {e}")
        elif settings.GEMINI_API_KEY:
            try:
                self.primary_provider = GeminiLLMProvider(settings.GEMINI_API_KEY)
            except Exception as e:
                logger.warning(f"[LLM] Failed to initialize Gemini provider: {e}")

    @property
    def fallback(self) -> BaseLLMProvider:
        if self._fallback is None:
            self._fallback = MockLLMProvider()
        return self._fallback

    async def generate_response(self, prompt: str, system_instruction: str = "") -> str:
        if self.primary_provider:
            try:
                res = await self.primary_provider.generate_response(prompt, system_instruction)
                self.used_fallback = False
                return res
            except Exception as e:
                logger.warning(f"[LLM] Primary provider error ({e}), falling back to local extractor.")
        self.used_fallback = True
        return await self.fallback.generate_response(prompt, system_instruction)


class SafeEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self):
        self.primary_provider = None
        self._fallback = None
        if settings.OPENAI_API_KEY:
            try:
                self.primary_provider = OpenAIEmbeddingProvider(settings.OPENAI_API_KEY)
            except Exception as e:
                logger.warning(f"[Embedding] Failed to initialize OpenAI embedding provider: {e}")
        elif settings.GEMINI_API_KEY:
            try:
                self.primary_provider = GeminiEmbeddingProvider(settings.GEMINI_API_KEY)
            except Exception as e:
                logger.warning(f"[Embedding] Failed to initialize Gemini embedding provider: {e}")

    @property
    def fallback(self) -> BaseEmbeddingProvider:
        if self._fallback is None:
            self._fallback = LocalSentenceEmbeddingProvider()
        return self._fallback

    def embed_texts(self, texts: list) -> list:
        if self.primary_provider:
            try:
                return self.primary_provider.embed_texts(texts)
            except Exception as e:
                logger.warning(f"[Embedding] Primary provider error ({e}), falling back to local embedder.")
        return self.fallback.embed_texts(texts)

    def embed_query(self, query: str) -> list:
        if self.primary_provider:
            try:
                return self.primary_provider.embed_query(query)
            except Exception as e:
                logger.warning(f"[Embedding] Primary query error ({e}), falling back to local embedder.")
        return self.fallback.embed_query(query)


# Provider singletons to avoid repeated re-initialization
_llm_provider_instance: SafeLLMProvider = None
_embedding_provider_instance: SafeEmbeddingProvider = None

def get_llm_provider() -> BaseLLMProvider:
    global _llm_provider_instance
    if _llm_provider_instance is None:
        _llm_provider_instance = SafeLLMProvider()
    return _llm_provider_instance

def get_embedding_provider() -> BaseEmbeddingProvider:
    global _embedding_provider_instance
    if _embedding_provider_instance is None:
        _embedding_provider_instance = SafeEmbeddingProvider()
    return _embedding_provider_instance
