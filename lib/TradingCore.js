const EventEmitter = require("events");

class TradingCore extends EventEmitter {
	constructor(opts, currencyCore) {
		super();
		this._started = Date.now();
		this._minQueuePercentageThreshold = opts.minQueuePercentageThreshold
			? opts.minQueuePercentageThreshold / 100 + 1
			: 0;
		this._minHitsThreshold = opts.minHitsThreshold ? opts.minHitsThreshold : 0;
		this._currencyCore = currencyCore;
		this._activeTrades = {};
	}

	initiateTrade(pathInfo) {
		// Your initiateTrade logic goes here
	}

	updateCandidateQueue(stream, candidates, queue) {
		for (let i = 0; i < candidates.length; i++) {
			let cand = candidates[i];

			if (cand.rate >= this._minQueuePercentageThreshold) {
				let key = cand.a_step_from + cand.b_step_from + cand.c_step_from;

				if (!queue[key]) {
					cand.rates = [];
					cand.hits = 1;
					queue[key] = cand;
				} else {
					queue[key].hits++;
				}
				queue[key].rates.push(cand.rate);
			} else {
				break;
			}
		}

		if (queue) {
			queue.sort((a, b) => parseInt(b.hits) - parseInt(a.hits));
			this.candidateQueue = queue;
			this.emit("queueUpdated", queue);
			this.processQueue(queue, stream, this.time());
		}

		return queue;
	}

	processQueue(queue, stream) {
		let keys = Object.keys(queue);

		for (let i = 0; i < keys.length; i++) {
			let cand = queue[keys[i]];

			if (cand.hits >= this._minHitsThreshold) {
				let liveRate = this._currencyCore.getArbitrageRate(
					stream,
					cand.a_step_from,
					cand.b_step_from,
					cand.c_step_from
				);
				if (liveRate && liveRate.rate >= this._minQueuePercentageThreshold) {
					this.emit("newTradeQueued", cand, this.time());
					// Begin trading logic
				}
			}
		}
	}

	time() {
		return this._started && Date.now() - this._started;
	}
}

module.exports = TradingCore;
