import re
import hashlib
from typing import List
from app.services.llm.base import BaseLLMProvider, BaseEmbeddingProvider

class MockLLMProvider(BaseLLMProvider):
    """
    Fallback LLM provider when no external API key is provided.
    Extracts answer directly from context passages.
    """
    async def generate_response(self, prompt: str, system_instruction: str = "") -> str:
        # Extract user query and context block from prompt
        context_str = prompt
        user_query = prompt
        
        if "USER INQUIRY:" in prompt:
            parts = prompt.split("USER INQUIRY:")
            context_str = parts[0].replace("KNOWLEDGE BASE CONTEXT:", "").strip()
            user_query = parts[1].strip()
        elif "USER QUERY:" in prompt:
            parts = prompt.split("USER QUERY:")
            context_str = parts[0].replace("CONTEXT:", "").strip()
            user_query = parts[1].strip()

        clean_q = user_query.lower().strip()

        # 1. Handle common greetings
        if clean_q in ["hi", "hello", "hey", "namaste", "good morning", "good evening", "good afternoon", "hii", "helloo", "hlo"]:
            return (
                "👋 Hello! Welcome to **XYZ College (XYZCE & XYZIET)** admissions and student helpdesk.\n\n"
                "I can help you with:\n"
                "- 🎓 **B.Tech Courses & Specializations** (CSE, AI & DS, Cyber Security, etc.)\n"
                "- 💰 **Fee Structure & Concessions**\n"
                "- 🏛️ **REAP Codes (1023 & 1050) & Cutoffs**\n"
                "- 🏆 **Scholarships & Lateral Entry**\n"
                "- 🏢 **Campus Placements & Recruiters**\n"
                "- 🛏️ **Hostels & Transport Facility**\n\n"
                "Which course or branch are you interested in pursuing?"
            )

        if not context_str or "No matching context found" in context_str:
            return "I couldn't find specific details for that in the college knowledge base. Please feel free to ask about our courses, eligibility, fee structure, scholarships, or REAP admissions!"

        # Extract clean passages
        raw_passages = [p.strip() for p in context_str.split("\n\n---\n\n") if p.strip()]
        if not raw_passages:
            raw_passages = [p.strip() for p in context_str.split("\n\n") if p.strip()]

        cleaned_passages = []
        for p in raw_passages:
            # Strip prefix headers like SOURCE:, URL:, CONTENT:
            lines = p.split("\n")
            content_lines = []
            capture = False
            for line in lines:
                if line.startswith("CONTENT:"):
                    capture = True
                    content_lines.append(line.replace("CONTENT:", "").strip())
                elif capture:
                    content_lines.append(line)
                elif not line.startswith("SOURCE:") and not line.startswith("URL:") and not line.startswith("[REAL_WEBSITE]"):
                    content_lines.append(line)
            clean_text = "\n".join(content_lines).strip()
            if clean_text:
                cleaned_passages.append(clean_text)

        if not cleaned_passages:
            cleaned_passages = raw_passages

        # Intent based scoring
        course_keywords = {"crouse", "course", "courses", "branch", "branches", "program", "programs", "specialization", "specializations", "degree", "b.tech", "btech", "provide", "offer"}
        fee_keywords = {"fee", "fees", "cost", "charge", "charges", "tuition", "annual fee", "structure", "price"}
        admission_keywords = {"admission", "addmission", "admissions", "apply", "eligibility", "reap", "process", "procedure", "how to get", "criteria", "cutoff", "cutoffs", "management quota"}
        placement_keywords = {"placement", "placements", "package", "lpa", "salary", "recruiter", "recruiters", "mnc", "companies", "highest"}
        hostel_keywords = {"hostel", "hostels", "mess", "room", "rooms", "accommodation", "stay"}
        scholarship_keywords = {"scholarship", "scholarships", "waiver", "concession", "merit"}

        q_words = set(clean_q.split())
        
        # Check topic affinity
        best_passage = None
        if q_words.intersection(course_keywords) and not q_words.intersection(fee_keywords):
            for cp in cleaned_passages:
                if "Specializations" in cp or "Computer Science" in cp or "Core Engineering" in cp:
                    best_passage = cp
                    break
        elif q_words.intersection(fee_keywords):
            for cp in cleaned_passages:
                if "Fee Structure" in cp or "₹" in cp or "Annual Tuition" in cp:
                    best_passage = cp
                    break
        elif q_words.intersection(admission_keywords) and not q_words.intersection(fee_keywords):
            for cp in cleaned_passages:
                if "REAP Code" in cp or "Eligibility" in cp or "Admission Guidelines" in cp:
                    best_passage = cp
                    break
        elif q_words.intersection(placement_keywords):
            for cp in cleaned_passages:
                if "Placement" in cp or "LPA" in cp or "Recruiters" in cp:
                    best_passage = cp
                    break
        elif q_words.intersection(hostel_keywords):
            for cp in cleaned_passages:
                if "Hostel" in cp or "Mess" in cp or "Occupancy" in cp:
                    best_passage = cp
                    break
        elif q_words.intersection(scholarship_keywords):
            for cp in cleaned_passages:
                if "Scholarship" in cp or "Shanti Devi" in cp:
                    best_passage = cp
                    break

        if not best_passage:
            # Word overlap fallback
            best_passage = max(cleaned_passages, key=lambda p: len(set(p.lower().split()).intersection(q_words)))

        # Clean any remaining internal markers
        best_passage = re.sub(r'^(SOURCE:.*?CONTENT:\s*)', '', best_passage, flags=re.DOTALL)
        best_passage = best_passage.strip()

        # Format cleanly
        return f"{best_passage}\n\n*Would you like to know more about the eligibility criteria, fees, or direct admission procedure?*"


class LocalSentenceEmbeddingProvider(BaseEmbeddingProvider):
    """
    Local embedding provider using SentenceTransformers or deterministic feature hash vectors.
    Lazily loads the heavy transformer model on first use.
    """
    def __init__(self):
        self.model = None
        self._load_attempted = False

    def _ensure_model(self):
        if not self._load_attempted:
            self._load_attempted = True
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
            except Exception as e:
                print(f"[LocalSentenceEmbeddingProvider] SentenceTransformer fallback to feature hash: {e}")

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        self._ensure_model()
        if self.model:
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
        
        # Fallback hash vector (64 dimensions)
        results = []
        for text in texts:
            vec = [0.0] * 64
            words = text.lower().split()
            for word in words:
                h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
                idx = h % 64
                vec[idx] += 1.0
            norm = sum(x*x for x in vec) ** 0.5 or 1.0
            results.append([x / norm for x in vec])
        return results

    def embed_query(self, query: str) -> List[float]:
        return self.embed_texts([query])[0]
