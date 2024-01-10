let CLI = require("clui");
let clc = require("cli-color");

let Line = CLI.Line;
let LineBuffer = CLI.LineBuffer;

class UserInterface {
	constructor(options) {
		this.options = options;
		this.outputBuffer = new CLI.LineBuffer({
			x: 0,
			y: 0,
			width: "console",
			height: "console",
		});

		this.blankLine = new CLI.Line(this.outputBuffer).fill().store();

		this.cols = [10, 10, 20];

		this.header = new CLI.Line(this.outputBuffer)
			.column("Step A", this.cols[0], [clc.cyan])
			.column("Step B", this.cols[0], [clc.cyan])
			.column("Step C", this.cols[0], [clc.cyan])
			.column("Rate", this.cols[1], [clc.cyan])
			.column("Fees BnB", this.cols[1], [clc.cyan])
			.column("(Rate - BnB Fee)", 20, [clc.green])
			.column("Fees Normal", 17, [clc.cyan])
			.column("(Rate - Fee)", 20, [clc.green])
			.fill()
			.store();

		this.line;
		this.maxRows = process.env.maxRows;
		this.outputBuffer.output();
	}

	updateArbitrageOpportunities(tickers) {
		if (!this.outputBuffer || !tickers) {
			return;
		}

		this.outputBuffer.lines.splice(3, this.outputBuffer.lines.length - 3);

		for (let i = 0; i < this.maxRows; i++) {
			let ticker = tickers[i];
			if (!ticker) return;
			if (ticker.a) {
				const color = clc.green;
				if (ticker.rate && ticker.rate < 1) color = clc.red;

				const rate = (ticker.rate - 1) * 100;
				const fees1 = rate * 0.05; //bnb
				const fRate1 = rate - fees1;

				const fees2 = rate * 0.1; //other
				const fRate2 = rate - fees2;

				this.line = new CLI.Line(this.outputBuffer)
					.column(ticker.a.key.toString(), this.cols[0], [clc.cyan])
					.column(ticker.b.stepFrom.toString(), this.cols[0], [clc.cyan])
					.column(ticker.c.stepFrom.toString(), this.cols[0], [clc.cyan])
					.column(rate.toFixed(3).toString() + "%", this.cols[1], [clc.cyan])
					.column(fees1.toFixed(3).toString() + "%", this.cols[1], [clc.cyan])
					.column(fRate1.toFixed(3).toString() + "%", 20, [color])
					.column(fees2.toFixed(3).toString() + "%", 17, [clc.cyan])
					.column(fRate2.toFixed(3).toString() + "%", 20, [color])
					.fill()
					.store();
			} else {
				this.line = new CLI.Line(this.outputBuffer).fill().store();
			}
		}

		this.outputBuffer.output();
	}

	updateTickers(tickers) {
		if (!this.outputBuffer || !tickers) {
			return;
		}

		const keys = Object.keys(tickers).sort();
		if (this.outputBuffer.lines.length >= keys.length)
			this.outputBuffer.lines.splice(3, keys.length);

		for (let i = 0; i < keys.length; i++) {
			const ticker = tickers[keys[i]];
			if (!ticker) return;

			this.line = new CLI.Line(this.outputBuffer)
				.column(ticker.E.toString(), this.cols[0])
				.column(ticker.s.toString(), this.cols[1])
				.column(ticker.b.toString(), this.cols[2])
				.column(ticker.B.toString(), this.cols[3])
				.column(ticker.a.toString(), this.cols[2])
				.column(ticker.A.toString(), this.cols[3])
				.column(ticker.n.toString(), this.cols[1])
				.fill()
				.store();
		}
		this.outputBuffer.output();
	}

	/*  { eventType: 'aggTrade',
      eventTime: 1514559250559,
      symbol: 'XRPETH',
      tradeId: 916488,
      price: '0.00224999',
      quantity: '100.00000000',
      firstTradeId: 1090457,
      lastTradeId: 1090457,
      time: 1514559250554,
      maker: false,
      ignored: true
	} */

	updateUI(trimOld) {
		if (trimOld && this.outputBuffer.lines.length > this.maxRows)
			this.outputBuffer.lines.splice(3, 1);
		this.outputBuffer.output();
	}

	addTrade(time, symbol, tradeId, price, quantity) {
		this.line = new CLI.Line(this.outputBuffer)
			.column(time.toString(), this.cols[0])
			.column(symbol.toString(), this.cols[1])
			.column(price.toString(), this.cols[2])
			.column(quantity.toString(), this.cols[3])
			.fill()
			.store();

		this.updateUI(true);
	}
}

module.exports = UserInterface;
