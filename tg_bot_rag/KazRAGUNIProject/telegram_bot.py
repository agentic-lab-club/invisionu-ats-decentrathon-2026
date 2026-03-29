import logging
import os

import httpx
from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

RAG_INVOKE_URL = os.getenv("RAG_INVOKE_URL", "http://localhost:8000/rag/invoke")
RAG_TIMEOUT_SECONDS = float(os.getenv("RAG_TIMEOUT_SECONDS", "60"))


async def ask_rag(question: str) -> str:
    payload = {"input": question}
    async with httpx.AsyncClient(timeout=RAG_TIMEOUT_SECONDS) as client:
        response = await client.post(RAG_INVOKE_URL, json=payload)
        response.raise_for_status()

    data = response.json()
    if isinstance(data, dict):
        output = data.get("output")
        if isinstance(output, str):
            return output

        # Fallback for structured outputs if chain response format changes.
        if isinstance(output, dict) and "content" in output:
            return str(output["content"])

    return str(data)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    del context
    await update.message.reply_text(
        "Привет! Я твой личный ассистент по помощи поступить в наш вуз InVision."
    )

async def on_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    del context
    if not update.message or not update.message.text:
        return

    question = update.message.text.strip()
    if not question:
        await update.message.reply_text("Пустой запрос. Напиши вопрос текстом.")
        return

    await update.message.chat.send_action(action=ChatAction.TYPING)

    try:
        answer = await ask_rag(question)
    except httpx.HTTPStatusError as exc:
        logger.exception("RAG API returned HTTP error")
        await update.message.reply_text(
            f"RAG API вернул ошибку: {exc.response.status_code}. Проверь `/health` и `/rag/invoke`."
        )
        return
    except Exception:
        logger.exception("Unexpected bot error")
        await update.message.reply_text("Не смог получить ответ от RAG API. Попробуй позже.")
        return

    await update.message.reply_text(answer)


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("Set TELEGRAM_BOT_TOKEN in your environment or .env file")

    application = Application.builder().token(token).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_message))

    logger.info("Starting Telegram bot. RAG endpoint: %s", RAG_INVOKE_URL)
    application.run_polling(close_loop=False)


if __name__ == "__main__":
    main()

