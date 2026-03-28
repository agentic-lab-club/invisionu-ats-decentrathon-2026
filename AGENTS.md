# MonoRepository Guidelines

For Additional Context What We Are Building (Product/Project and Business) Check The README.md In Root.

## Project Structure & Module Organization

This root is Umbrella workspace. Each top-level folder is its LIKE Repository and Module. Enter that folder before running git, builds, or Docker Compose. All Monorepo seperate modules is described here (and does have Standards listed below):

- `frontend/`: Frontend.
- `backend/`: Golang Core Backend Service.
- `llm/`: Python LLM Scoring and seperated FastAPI webserver.
- `telegram-bot/`: RAG-based University Admission AI Chatbot, on Telegram using Aiogram, and Python, also has RAG.
- `docs/ai-sessions/`: here we keep our AI chat sessions, can be used for extended context.
- other /folders that was not listed here (not a product repo/modules).

---

Modules Standards (each module have things):

- docker compose
- README.md
