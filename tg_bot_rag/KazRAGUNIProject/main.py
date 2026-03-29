from fastapi import FastAPI, Body
from langserve import add_routes
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
import os
from urllib.parse import urlparse

import chromadb
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RAG API", version="1.0")

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

@app.post("/ingest")
def ingest_documents():
    """Загружает данные с сайта inVision U в Chroma"""
    urls = [
        "https://www.invisionu.education/ru",
        "https://www.invisionu.education/ru/undergraduate",
        "https://www.invisionu.education/ru/foundation",
        "https://www.invisionu.education/ru/apply",
        "https://www.invisionu.education/ru/education",
        "https://www.invisionu.education/ru/contacts",
    ]

    print(f"🚀 Загружаем {len(urls)} страниц...")

    loader = WebBaseLoader(urls)
    docs = loader.load()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        add_start_index=True,
    )
    splits = text_splitter.split_documents(docs)

    vectorstore.add_documents(splits)

    print(f"✅ Загружено {len(splits)} чанков из {len(urls)} страниц")
    return {
        "status": "success",
        "pages_loaded": len(urls),
        "chunks_added": len(splits),
        "message": "Данные из сайта inVision U успешно добавлены в Chroma"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)