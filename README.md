# 🤖 AI Stock Price Agent

A command-line agent that answers plain-English stock questions. You ask something like *"How is Microsoft doing today?"*, an OpenAI model works out which ticker you mean, and the app fetches the latest intraday price from [Alpha Vantage](https://www.alphavantage.co/).

```text
# example session (prices are illustrative)
💡 AI Stock Price Agent (OpenAI + Alpha Vantage)
Type "exit" to quit.

Ask about a stock (e.g. 'What's Apple trading at?'): how's nvidia looking
🤖 AI processing your query...
🔍 AI identified stock symbol: NVDA

📊 Stock: NVDA
📅 Time: 2025-05-30 19:55:00
📈 Open: $135.10
...
```

## How it works

1. **Understand the question.** The query goes to an OpenAI chat model with a system prompt that forces a one-word reply: the ticker, or `NONE`.
2. **Validate.** The reply is checked against a ticker pattern (`AAPL`, `BRK.B`), so a chatty or wrong answer never reaches the price API.
3. **Fetch.** The app calls Alpha Vantage's `TIME_SERIES_INTRADAY` endpoint (5-minute bars) and prints the most recent bar. Rate-limit and unknown-symbol responses are reported clearly instead of failing silently.

## Tech stack

Node.js (ES modules) · OpenAI API · Alpha Vantage API · axios · dotenv · readline-sync

## Getting started

**You'll need:** Node.js 18+, an [OpenAI API key](https://platform.openai.com/api-keys), and a free [Alpha Vantage key](https://www.alphavantage.co/support/#api-key).

```bash
git clone https://github.com/mercyy1/AI-Stock-Price-Agent.git
cd AI-Stock-Price-Agent
npm install
cp .env.example .env   # then paste your keys into .env
npm start
```

Optional: set `OPENAI_MODEL` in `.env` to use a different chat model (defaults to `gpt-4`).

## Limitations

- Alpha Vantage's free tier allows only a small number of requests per day.
- Intraday data covers US-listed tickers only.
- It reports the latest price; it does not do analysis or predictions.
