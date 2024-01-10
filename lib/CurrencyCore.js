const PairRanker = require("./PairRanker");
const UI = require("./UI.js");
let pairRanker = new PairRanker();
const binanceExchange = require("binance");

const binanceColumns = ["BNB", "ETH", "USDT"];
let candidates = [];
let pairRanks = [];

let arbitrage = {
	paths: binanceColumns, // possible currencies we step via
	start: "BTC", // binanceStartingPoint
};

class CurrencyCore {
	currencies = {};
	sockets = {};
	streams = {};
	ctrl = null;
	UI = null;
	steps = ["BTC", "ETH", "BNB", "USDT"];
	events = {
		onAllTickerStream: (stream) => {
			const key = "allMarketTickers";
			this.streams[key] = {
				arr: stream,
				obj: stream.reduce(function (array, current) {
					array[current.s] = current;
					return array;
				}, {}),
				markets: {},
			};

			for (let i = 0; i < this.steps.length; i++) {
				this.streams[key].markets[this.steps[i]] = stream.filter((e) => {
					return e.s.endsWith(this.steps[i]) || e.s.startsWith(this.steps[i]);
				});
			}

			this.handleStreamTick(this.streams[key], key);
		},
	};
	constructor(ctrl) {
		if (!ctrl.exchange) {
			throw "Undefined currency exchange. Will not be able to communicate with exchange API.";
		}

		this.ctrl = ctrl;
		this.UI = new UI(ctrl.options);

		this.startAllTickerStream(ctrl.exchange);
		this.queueTicker(5000);
	}

	queueTicker(interval = 3000) {
		setTimeout(() => {
			this.queueTicker(interval);
		}, interval);
		this.tick();
	}

	tick() {
		//debugger;
	}

	getCurrencyFromStream(stream, fromCur, toCur) {
		if (!stream || !fromCur || !toCur) return;

		/*
		Binance uses xxxBTC notation. If we're looking at xxxBTC and we want to go from BTC to xxx, that means we're buying, vice versa for selling.
		*/
		let currency = stream.obj[toCur + fromCur];

		if (currency) {
			// found a match using reversed binance syntax, meaning we're buying if we're going from->to (btc->xxx in xxxBTC ticker) using a fromCurtoCur ticker.
			currency.flipped = false;
			currency.rate = currency.a;

			// BNBBTC
			// ask == trying to buy
		} else {
			currency = stream.obj[fromCur + toCur];
			if (!currency) {
				return false;
			}
			currency.flipped = true;
			currency.rate = 1 / currency.b;

			// BTCBNB
			// bid == im trying to sell.
		}
		currency.stepFrom = fromCur;
		currency.stepTo = toCur;

		currency.tradeInfo = {
			symbol: currency.s,
			side: currency.flipped == true ? "SELL" : "BUY",
			type: "MARKET",
			quantity: 1,
		};
		// console.log('getCurrencyFromStream: from/to: ', currency.stepFrom, currency.stepTo);

		return currency;
	}

	getArbitrageRate(stream, step1, step2, step3) {
		if (!stream || !step1 || !step2 || !step3) {
			return;
		}

		let rate = {
			a: this.getCurrencyFromStream(stream, step1, step2),
			b: this.getCurrencyFromStream(stream, step2, step3),
			c: this.getCurrencyFromStream(stream, step3, step1),
		};

		if (!rate.a || !rate.b || !rate.c) {
			return;
		}

		rate.rate = rate.a.rate * rate.b.rate * rate.c.rate;
		return rate;
	}

	getCandidatesFromStreamViaPath(stream, aPair, bPair) {
		let keys = {
			a: aPair.toUpperCase(),
			b: bPair.toUpperCase(),
			c: "findme".toUpperCase(),
		};

		let apairs = stream.markets[keys.a];
		let bpairs = stream.markets[keys.b];

		let akeys = [];

		apairs.map((obj, i, array) => {
			akeys[obj.s.replace(keys.a, "")] = obj;
		});

		// prevent 1-steps
		delete akeys[keys.b];

		/*
			Loop through BPairs
		  for each bpair key, check if apair has it too.
		  If it does, run arbitrage math
	  		*/
		let bmatches = [];
		for (let i = 0; i < bpairs.length; i++) {
			let bPairTicker = bpairs[i];
			bPairTicker.key = bPairTicker.s.replace(keys.b, "");

			// from B to C
			bPairTicker.startsWithKey = bPairTicker.s.startsWith(keys.b);

			// from C to B
			bPairTicker.endsWithKey = bPairTicker.s.endsWith(keys.b);

			if (akeys[bPairTicker.key]) {
				let match = bPairTicker;
				// check price from bPairTicker.key to keys.a

				let stepC = this.getCurrencyFromStream(stream, match.key, keys.a);

				// only do this if we definitely found a path. Some paths are impossible, so will result in an empty stepC quote.
				if (stepC) {
					keys.c = match.key;

					let comparison = this.getArbitrageRate(
						stream,
						keys.a,
						keys.b,
						keys.c
					);

					if (comparison) {
						// console.log('getCandidatesFromStreamViaPath: from/to a: ', comparison.a.stepFrom, comparison.a.stepTo);
						// console.log('getCandidatesFromStreamViaPath: from/to b: ', comparison.b.stepFrom, comparison.b.stepTo);
						// console.log('getCandidatesFromStreamViaPath: from/to c: ', comparison.c.stepFrom, comparison.c.stepTo);

						let dt = new Date();
						let triangle = {
							ws_ts: comparison.a.E,
							ts: +dt,
							dt: dt,

							// these are for storage later
							a: comparison.a, //full ticker for first pair (BTC->BNB)
							a_symbol: comparison.a.s,
							a_step_from: comparison.a.stepFrom, //btc
							a_step_to: comparison.a.stepTo, //bnb
							a_step_type: comparison.a.tradeInfo.side,
							a_bid_price: comparison.a.b,
							a_bid_quantity: comparison.a.B,
							a_ask_price: comparison.a.a,
							a_ask_quantity: comparison.a.A,
							a_volume: comparison.a.v,
							a_trades: comparison.a.n,

							b: comparison.b, //full ticker for second pair (BNB->XMR)
							b_symbol: comparison.b.s,
							b_step_from: comparison.b.stepFrom, //bnb
							b_step_to: comparison.b.stepTo, //xmr
							b_step_type: comparison.b.tradeInfo.side,
							b_bid_price: comparison.b.b,
							b_bid_quantity: comparison.b.B,
							b_ask_price: comparison.b.a,
							b_ask_quantity: comparison.b.A,
							b_volume: comparison.b.v,
							b_trades: comparison.b.n,

							c: comparison.c, ////full ticker for third pair (XMR->BTC)
							c_symbol: comparison.c.s,
							c_step_from: comparison.c.stepFrom, //xmr
							c_step_to: comparison.c.stepTo, //btc
							c_step_type: comparison.c.tradeInfo.side,
							c_bid_price: comparison.c.b,
							c_bid_quantity: comparison.c.B,
							c_ask_price: comparison.c.a,
							c_ask_quantity: comparison.c.A,
							c_volume: comparison.c.v,
							c_trades: comparison.c.n,

							rate: comparison.rate,
						};
						// debugger;
						bmatches.push(triangle);

						// console.log('getCandidatesFromStreamViaPath: from/to a: ', triangle.a_step_from, triangle.a_step_to);
						// console.log('getCandidatesFromStreamViaPath: from/to b: ', triangle.b_step_from, triangle.b_step_to);
						// console.log('getCandidatesFromStreamViaPath: from/to c: ', triangle.c_step_from, triangle.c_step_to);
					}
				}
			}
		}

		if (bmatches.length) {
			bmatches.sort(function (a, b) {
				return parseFloat(b.rate) - parseFloat(a.rate);
			});
		}

		return bmatches;
	}

	getDynamicCandidatesFromStream(stream, arbitrage) {
		let matches = [];

		// I think here it's looping the selected cryptos from options
		for (let i = 0; i < arbitrage.paths.length; i++) {
			let pMatches = this.getCandidatesFromStreamViaPath(
				stream,
				arbitrage.start,
				arbitrage.paths[i]
			);
			matches = matches.concat(pMatches);
		}

		if (matches.length) {
			matches.sort(function (a, b) {
				return parseFloat(b.rate) - parseFloat(a.rate);
			});
		}

		return matches;
	}

	startAllTickerStream(exchange) {
		if (!this.streams.allMarketTickers) {
			this.streams.allMarketTickers = {
				arr: [],
				obj: {},
				markets: {},
			};
		}

		let binanceWS = new binanceExchange.BinanceWS(false);

		// this.sockets.allMarketTickerStream = exchange.WS.onAllTickers((event) =>
		// 	this.events.onAllTickerStream(event)
		// );
		this.sockets.allMarketTickerStream = binanceWS.onAllTickers((event) =>
			this.events.onAllTickerStream(event)
		);
	}

	// Moved from StreamHandler
	handleStreamTick(stream, streamID) {
		if (streamID === "allMarketTickers") {
			this.handleArbitrageOpportunities(stream);
			this.handleTradeablePair();
			this.updateUIWithLatestValues();
		}
	}

	handleArbitrageOpportunities(stream) {
		candidates = this.getDynamicCandidatesFromStream(stream, arbitrage);
	}

	handleTradeablePair() {
		const pairToTrade = pairRanker.getPairRanking(
			candidates,
			pairRanks,
			this.ctrl
		);

		if (pairToTrade !== "none") {
			// console.log("<----GO TRADE---->");
		}
	}

	updateUIWithLatestValues() {
		this.UI.updateArbitrageOpportunities(candidates);
	}
}

module.exports = CurrencyCore;
