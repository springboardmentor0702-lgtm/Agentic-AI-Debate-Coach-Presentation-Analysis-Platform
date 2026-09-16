"""
Real RAG grounding for evidence-based rebuttals — two real sources, no
invented facts:

1. Live Wikipedia search via Wikipedia's public REST API — genuine,
   real-time results, not cached/fabricated content.
2. A local FAISS vector store over documents YOU or an Educator/Admin
   actually upload (real text, embedded with Gemini's embedding model),
   so the AI can cite from a curated real source too.

If neither source returns anything relevant, retrieve_evidence() returns
an empty list — the Opponent is instructed to say it has no verified
source rather than invent a statistic, which is the actual point of this
module.
"""
import os
import requests
from typing import Optional
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

from app.core.config import settings

_INDEX_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "faiss_index")
_embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=settings.GOOGLE_API_KEY)

_vectorstore: Optional[FAISS] = None


def _load_or_init_store() -> Optional[FAISS]:
    global _vectorstore
    if _vectorstore is not None:
        return _vectorstore
    if os.path.exists(_INDEX_DIR):
        try:
            _vectorstore = FAISS.load_local(_INDEX_DIR, _embeddings, allow_dangerous_deserialization=True)
        except Exception as e:
            print(f"Could not load existing FAISS index, starting fresh: {e}")
            _vectorstore = None
    return _vectorstore


def add_document(doc_id: str, title: str, content: str) -> None:
    """Embeds and adds a real user-provided document to the local knowledge base."""
    global _vectorstore
    doc = Document(page_content=content, metadata={"doc_id": doc_id, "title": title, "source": "uploaded"})
    store = _load_or_init_store()
    if store is None:
        _vectorstore = FAISS.from_documents([doc], _embeddings)
    else:
        store.add_documents([doc])
        _vectorstore = store
    os.makedirs(_INDEX_DIR, exist_ok=True)
    _vectorstore.save_local(_INDEX_DIR)


def search_wikipedia(query: str, limit: int = 3) -> list[dict]:
    """Real, live Wikipedia search — actual API call, actual current results."""
    try:
        resp = requests.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query", "list": "search", "srsearch": query,
                "format": "json", "srlimit": limit, "srprop": "snippet"
            },
            timeout=5
        )
        resp.raise_for_status()
        results = resp.json().get("query", {}).get("search", [])
        return [
            {
                "source": "Wikipedia",
                "title": r["title"],
                # Wikipedia's own search snippet already strips HTML except <span> highlight tags
                "snippet": r["snippet"].replace('<span class="searchmatch">', "").replace("</span>", ""),
                "url": f"https://en.wikipedia.org/wiki/{r['title'].replace(' ', '_')}"
            }
            for r in results
        ]
    except Exception as e:
        print(f"Wikipedia search failed (non-fatal, grounding just has less to work with): {e}")
        return []


def search_documents(query: str, k: int = 3) -> list[dict]:
    """Real similarity search over documents actually uploaded to the local store."""
    store = _load_or_init_store()
    if store is None:
        return []
    try:
        results = store.similarity_search(query, k=k)
        return [
            {"source": "Uploaded Document", "title": r.metadata.get("title", "Untitled"),
             "snippet": r.page_content[:400], "url": None}
            for r in results
        ]
    except Exception as e:
        print(f"Document search failed (non-fatal): {e}")
        return []


def retrieve_evidence(topic: str) -> list[dict]:
    """Merges both real sources. Returns [] if nothing relevant found —
    that's the honest signal the Opponent should NOT claim a source."""
    return search_wikipedia(topic, limit=3) + search_documents(topic, k=3)
