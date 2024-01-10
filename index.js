const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const logger = require("./lib/LoggerCore");
const binanceExchange = require("binance");
const UI = require("./lib/UI");
const CurrencyCore = require("./lib/CurrencyCore");

logger.info("\n\n Bot Starting: -----\n\n\n");

const beautifyResponse = false;
const binanceColumns = ["BNB", "ETH", "USDT"];

let exchangeAPI = new binanceExchange.BinanceRest({
	timeout: parseInt(process.env.restTimeout), // Optional, defaults to 15000, is the request time out in milliseconds
	recvWindow: parseInt(process.env.restRecvWindow), // Optional, defaults to 5000, increase if you're getting timestamp errors
	disableBeautification: false,
});

// exchangeAPI.WS = new binanceExchange.BinanceWS(false);

let ctrl = {
	options: {
		UI: {
			title:
				"Top Potential Arbitrage Triplets, via: " + binanceColumns.join(","),
		},
		// arbitrage: {
		// 	paths: binanceColumns, // possible currencies we step via
		// 	start: "BTC", // binanceStartingPoint
		// },
		storage: {
			logHistory: false,
		},
		trading: {
			paperOnly: true,
			// only candidates with over x% gain potential are queued for trading
			minQueuePercentageThreshold: 3,
			// how many times we need to see the same opportunity before deciding to act on it
			minHitsThreshold: 5,
		},
	},
	storage: {
		trading: {
			// queued triplets
			queue: [],
			// actively trading triplets
			active: [],
		},
		candidates: [],
		streams: [],
		pairRanks: [],
	},
	logger: logger,
	exchange: exchangeAPI,
};

new CurrencyCore({ ...ctrl });

ctrl.logger.info("\n\n Launched...");
