import dotenv from 'dotenv';
import axios from 'axios';
import OpenAI from 'openai';
import readline from 'readline-sync';

dotenv.config();

const { OPENAI_API_KEY, ALPHA_VANTAGE_API_KEY } = process.env;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4';
const STOCK_API_URL = 'https://www.alphavantage.co/query';

// Fail fast with a clear message instead of a confusing API error later.
const missing = [
    !OPENAI_API_KEY && 'OPENAI_API_KEY',
    !ALPHA_VANTAGE_API_KEY && 'ALPHA_VANTAGE_API_KEY',
].filter(Boolean);
if (missing.length) {
    console.error(`❌ Missing ${missing.join(' and ')}. Copy .env.example to .env and fill in your keys.`);
    process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Fetch the latest 5-minute intraday bar for a symbol from Alpha Vantage.
async function fetchStockPrice(symbol) {
    try {
        const { data } = await axios.get(STOCK_API_URL, {
            params: {
                function: 'TIME_SERIES_INTRADAY',
                symbol,
                interval: '5min',
                apikey: ALPHA_VANTAGE_API_KEY,
            },
        });

        // Alpha Vantage returns 200 with a "Note"/"Information" field when rate-limited,
        // and an "Error Message" field for unknown symbols.
        if (data['Error Message']) return `⚠️ Alpha Vantage doesn't recognise "${symbol}".`;
        if (data['Note'] || data['Information']) return `⚠️ API limit reached: ${data['Note'] || data['Information']}`;

        const timeSeries = data['Time Series (5min)'];
        if (!timeSeries) return '⚠️ No price data returned for that symbol.';

        const latestTime = Object.keys(timeSeries)[0];
        const bar = timeSeries[latestTime];

        return [
            `📊 Stock: ${symbol}`,
            `📅 Time: ${latestTime}`,
            `📈 Open: $${bar['1. open']}`,
            `📉 High: $${bar['2. high']}`,
            `🔻 Low: $${bar['3. low']}`,
            `💰 Close: $${bar['4. close']}`,
            `📊 Volume: ${bar['5. volume']}`,
        ].join('\n');
    } catch (error) {
        return '❌ Error fetching stock data: ' + error.message;
    }
}

// Ask the model to pull a ticker out of a free-form question.
// The prompt pins the output format so we get "AAPL", not "The symbol is AAPL."
async function extractStockSymbol(userInput) {
    const aiResponse = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0,
        messages: [
            {
                role: 'system',
                content:
                    'Extract the stock ticker symbol the user is asking about. ' +
                    'Reply with ONLY the ticker in uppercase (e.g. AAPL, BRK.B). ' +
                    'If no company or ticker is mentioned, reply with NONE.',
            },
            { role: 'user', content: userInput },
        ],
    });

    return aiResponse.choices[0].message.content.trim().toUpperCase();
}

async function aiAgent(userInput) {
    console.log('\n🤖 AI processing your query...');

    const symbol = await extractStockSymbol(userInput);
    console.log('🔍 AI identified stock symbol:', symbol);

    // Tickers are letters, optionally with a class suffix like BRK.B or BF-B.
    if (symbol === 'NONE' || !/^[A-Z]{1,5}([.-][A-Z])?$/.test(symbol)) {
        console.log("⚠️ Couldn't determine a valid stock symbol. Try naming the company or ticker.");
        return;
    }

    console.log('\n' + (await fetchStockPrice(symbol)));
}

async function startAgent() {
    console.log('💡 AI Stock Price Agent (OpenAI + Alpha Vantage)');
    console.log('Type "exit" to quit.\n');

    while (true) {
        const userQuery = readline.question("\nAsk about a stock (e.g. 'What's Apple trading at?'): ").trim();
        if (!userQuery) continue;
        if (['exit', 'quit', 'q'].includes(userQuery.toLowerCase())) break;

        try {
            await aiAgent(userQuery);
        } catch (error) {
            console.error('❌ Something went wrong:', error.message);
        }
    }
}

startAgent();
