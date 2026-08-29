# Renewal, Lease & Contract Reminder Agent — Step 1

Minimal Telegram bot: connects and replies to any message. This is the
first step of a larger agent (see project chat for the full plan); nothing
beyond "connect and echo" is built yet.

## Setup

```bash
cd renewal-bot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then edit .env and paste your real bot token
python bot.py
```

`TELEGRAM_BOT_TOKEN` comes from [@BotFather](https://t.me/BotFather) on
Telegram (`/newbot` or `/token` for an existing bot). It lives only in the
local `.env` file, which is gitignored — never commit it.

## Testing

1. Open Telegram and search for your bot by the username you gave it in
   BotFather (e.g. `@your_bot_username`), or open the `t.me/<username>`
   link BotFather gave you.
2. Tap **Start** (or send any message).
3. The bot should reply `Bot is alive. You said: '<your message>'`.

Stop it with `Ctrl+C`.
