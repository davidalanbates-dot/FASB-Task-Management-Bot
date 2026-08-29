"""Step 1: minimal Telegram bot that replies to any message it receives.

Run with: python bot.py
Requires TELEGRAM_BOT_TOKEN in a .env file next to this script.
"""

import logging
import os

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, ContextTypes, MessageHandler, filters

load_dotenv()

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "YOUR_TELEGRAM_BOT_TOKEN":
    raise SystemExit(
        "TELEGRAM_BOT_TOKEN is not set. Put your real token (from @BotFather) "
        "into the .env file in this directory."
    )

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def reply_to_any_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text if update.message else None
    chat_id = update.effective_chat.id if update.effective_chat else "unknown"
    logger.info("Received message from chat %s: %r", chat_id, text)
    await update.message.reply_text(f"Bot is alive. You said: {text!r}")


def main() -> None:
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    app.add_handler(MessageHandler(filters.ALL, reply_to_any_message))
    logger.info("Starting bot (polling)...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
