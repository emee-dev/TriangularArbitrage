class PairRanker {
	/** Helps us list the combination that is tradable */
	getPairRanking(candidates, pairRanks, ctrl) {
		for (let i = 0; i < candidates.length; i++) {
			let candidate = candidates[i];
			let id =
				candidate["a_step_from"] +
				candidate["a_step_to"] +
				candidate["b_step_to"] +
				candidate["c_step_to"];
			let date = new Date();
			let pair = {
				id: id,
				step_a: candidate["a_step_from"],
				step_b: candidate["a_step_to"],
				step_c: candidate["b_step_to"],
				step_d: candidate["c_step_to"],
				rate: candidate["rate"],
				date: date,
			};
			pairRanks.push(pair);
		}
		pairRanks = this.cleanPairingArray(pairRanks);

		let check = false;
		let k = -1;
		let returnValue = "none";
		while (
			!check &&
			k < 5 &&
			candidates[0].rate > parseFloat(process.env.minimalProfit)
		) {
			k++;
			check = this.getTopPairs(candidates[k], pairRanks);
			returnValue = candidates[k];
		}

		// ctrl.storage.pairRanks = pairRanks;
		pairRanks = pairRanks;

		return returnValue;
	}

	cleanPairingArray(pairRanks) {
		let cleanArray = pairRanks.filter((pair) => {
			return pair.date > new Date() - process.env.pairTimer;
		});
		return cleanArray;
	}

	getTopPairs(pairToCheck, pairRanks) {
		let check = false;
		let id =
			pairToCheck["a_step_from"] +
			pairToCheck["a_step_to"] +
			pairToCheck["b_step_to"] +
			pairToCheck["c_step_to"];
		let pairsToCheck = pairRanks.filter((pair) => {
			return pair.id == id;
		});
		let rate = 0;
		for (let i = 0; i < pairsToCheck.length; i++) {
			rate += pairsToCheck[i].rate;
		}
		rate = rate / pairsToCheck.length;
		if (rate > parseFloat(process.env.minimalProfit)) {
			check = true;
		}
		return check;
	}
}

module.exports = PairRanker;
