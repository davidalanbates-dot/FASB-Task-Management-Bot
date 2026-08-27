import "dotenv/config";
import { createBot } from "./bot.js";
import { scheduleReminders } from "./reminders.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Set it in your environment or a .env file (see .env.example).");
  process.exit(1);
}

const bot = createBot(token);

scheduleReminders(bot);

bot.launch().then(() => {
  console.log("FASB Task Management Bot is running (polling).");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
