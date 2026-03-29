import os
import re
import hashlib
from urllib.parse import urljoin, urlparse, urlunparse
import asyncio
import chromadb
import httpx
from bs4 import BeautifulSoup
from bs4 import FeatureNotFound
from dotenv import load_dotenv
from fastapi import Body, FastAPI, BackgroundTasks
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langserve import add_routes

load_dotenv()

app = FastAPI(title="RAG API", version="1.0")

# --- ГЛОБАЛЬНЫЙ СТАТУС ДЛЯ ХАКАТОНА ---
CRAWL_STATUS = {
    "is_running": False,
    "last_result": "Еще не запускался",
    "pages": 0,
    "chunks": 0
}

# LLM + Embeddings
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
embeddings = OpenAIEmbeddings()

# Chroma HTTP client
chroma_url = os.getenv("CHROMA_URL", "http://chroma:8000")
parsed = urlparse(chroma_url)
chroma_host = parsed.hostname or "chroma"
chroma_port = parsed.port or 8000
chroma_ssl = parsed.scheme == "https"

chroma_client = chromadb.HttpClient(
    host=chroma_host,
    port=chroma_port,
    ssl=chroma_ssl,
)

vectorstore = Chroma(
    collection_name="rag_collection",
    embedding_function=embeddings,
    client=chroma_client,
)

retriever = vectorstore.as_retriever(search_kwargs={"k": 6})

# Простой RAG chain
template = """Ответь на вопрос на основе следующего контекста:

{context}

Вопрос: {question}
"""
prompt = ChatPromptTemplate.from_template(template)


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
)

add_routes(app, rag_chain, path="/rag")

SKIP_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico",
    ".pdf", ".zip", ".rar", ".7z", ".doc", ".docx", ".xls", ".xlsx",
    ".ppt", ".pptx", ".mp3", ".wav", ".mp4", ".avi", ".mov", ".css", ".js",
}


def normalize_url(href: str, base_url: str) -> str:
    absolute = urljoin(base_url, href)
    parsed = urlparse(absolute)
    without_fragment = parsed._replace(fragment="")
    normalized = urlunparse(without_fragment)
    if normalized.endswith("/") and without_fragment.path != "/":
        return normalized.rstrip("/")
    return normalized


def normalize_path(path: str) -> str:
    trimmed = path.rstrip("/")
    return trimmed or "/"


def is_allowed_url(url: str, allowed_host: str, allowed_path_prefix: str | None) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    if (parsed.hostname or "") != allowed_host:
        return False
    if allowed_path_prefix:
        normalized_path = normalize_path(parsed.path)
        if normalized_path != allowed_path_prefix and not normalized_path.startswith(f"{allowed_path_prefix}/"):
            return False
    lowered_path = parsed.path.lower()
    return not any(lowered_path.endswith(ext) for ext in SKIP_EXTENSIONS)


def extract_text_from_html(html: str) -> str:
    soup = parse_html(html)
    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()


def parse_html(html: str) -> BeautifulSoup:
    # В контейнере lxml может отсутствовать: делаем безопасный fallback.
    try:
        return BeautifulSoup(html, "lxml")
    except FeatureNotFound:
        return BeautifulSoup(html, "html.parser")


# Делаем функцию полностью асинхронной
async def async_crawl_site(start_url: str, max_pages: int, max_depth: int, request_timeout: float,
                           restrict_to_start_path: bool):
    allowed = urlparse(start_url)
    allowed_host = allowed.hostname or ""
    allowed_path_prefix = normalize_path(allowed.path) if restrict_to_start_path else None

    # Очередь для асинхронной обработки
    queue = asyncio.Queue()
    await queue.put((start_url, 0))

    visited = set([start_url])
    seen_content_hashes = set()
    documents = []
    failed_urls = []

    headers = {"User-Agent": "KazRAGUNIProjectBot/1.0"}

    async with httpx.AsyncClient(timeout=request_timeout, follow_redirects=True, headers=headers) as client:
        while not queue.empty() and len(documents) < max_pages:
            current_url, depth = await queue.get()

            try:
                response = await client.get(current_url)
                response.raise_for_status()
            except Exception as e:
                failed_urls.append(current_url)
                queue.task_done()
                continue

            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type:
                queue.task_done()
                continue

            final_url = normalize_url(str(response.url), current_url)
            if not is_allowed_url(final_url, allowed_host, allowed_path_prefix):
                queue.task_done()
                continue

            page_text = extract_text_from_html(response.text)
            if page_text:
                page_hash = hashlib.sha256(page_text.encode("utf-8")).hexdigest()
                if page_hash not in seen_content_hashes:
                    seen_content_hashes.add(page_hash)
                    documents.append(
                        Document(page_content=page_text, metadata={"source": final_url, "content_hash": page_hash})
                    )

            # Собираем новые ссылки
            if depth < max_depth:
                soup = parse_html(response.text)
                for link in soup.find_all("a", href=True):
                    href = (link.get("href") or "").strip()
                    if not href:
                        continue
                    candidate = normalize_url(href, final_url)
                    if is_allowed_url(candidate, allowed_host, allowed_path_prefix) and candidate not in visited:
                        visited.add(candidate)
                        await queue.put((candidate, depth + 1))

            queue.task_done()

    return documents, {"visited": len(visited), "failed": len(failed_urls)}


# Функция, которая будет крутиться в фоне и работать с Chroma
async def background_ingest_task(start_url, max_pages, max_depth, request_timeout, restrict_to_start_path):
    global CRAWL_STATUS
    CRAWL_STATUS["is_running"] = True
    CRAWL_STATUS["last_result"] = f"Сканируем {start_url}..."
    CRAWL_STATUS["pages"] = 0
    CRAWL_STATUS["chunks"] = 0

    try:
        print(f"🚀 [ФОН] Начат краулинг {start_url}...")
        docs, crawl_stats = await async_crawl_site(
            start_url, max_pages, max_depth, request_timeout, restrict_to_start_path
        )

        if not docs:
            print(f"⚠️ [ФОН] Краулер не нашел текста на {start_url}")
            CRAWL_STATUS["last_result"] = (
                f"Ошибка: текст не найден (visited={crawl_stats['visited']}, failed={crawl_stats['failed']})"
            )
            return

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, add_start_index=True)
        splits = text_splitter.split_documents(docs)

        unique_splits = []
        split_hashes = set()
        for split in splits:
            chunk_hash = hashlib.sha256(split.page_content.encode("utf-8")).hexdigest()
            if chunk_hash in split_hashes:
                continue
            split_hashes.add(chunk_hash)
            split.metadata["chunk_hash"] = chunk_hash
            unique_splits.append(split)

        vectorstore.add_documents(unique_splits)

        CRAWL_STATUS["last_result"] = (
            f"Успешно завершено (visited={crawl_stats['visited']}, failed={crawl_stats['failed']})"
        )
        CRAWL_STATUS["pages"] = len(docs)
        CRAWL_STATUS["chunks"] = len(unique_splits)

        print(f"✅ [ФОН] Завершено. Загружено чанков: {len(unique_splits)} из {len(docs)} страниц.")
    except Exception as e:
        print(f"❌ [ФОН] Ошибка в background_ingest_task: {e}")
        CRAWL_STATUS["last_result"] = f"Ошибка: {type(e).__name__}: {e}"
    finally:
        CRAWL_STATUS["is_running"] = False


@app.post("/ingest")
async def ingest_documents(
        background_tasks: BackgroundTasks,
        start_url: str = Body(default="https://www.invisionu.education/ru/", embed=True),
        max_pages: int = Body(default=1000, ge=1, le=10000, embed=True),
        max_depth: int = Body(default=10, ge=0, le=50, embed=True),
        request_timeout: float = Body(default=10.0, gt=0, le=60, embed=True),
        restrict_to_start_path: bool = Body(default=False, embed=True),
):
    """Отправляет задачу на краулинг в фон и мгновенно возвращает ответ."""

    # Защита от двойного запуска
    if CRAWL_STATUS["is_running"]:
        return {
            "status": "busy",
            "message": "Процесс краулинга уже запущен. Проверьте статус через /ingest/status"
        }

    # Запускаем фоновую задачу
    background_tasks.add_task(
        background_ingest_task,
        start_url, max_pages, max_depth, request_timeout, restrict_to_start_path
    )

    return {
        "status": "processing",
        "message": f"Процесс сканирования {start_url} запущен в фоне. Сервер готов принимать RAG запросы."
    }


@app.get("/ingest/status")
def get_ingest_status():
    """Возвращает текущий статус фонового парсинга."""
    return CRAWL_STATUS


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)