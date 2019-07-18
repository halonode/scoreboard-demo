"use strict";

const Promise = require('bluebird');
const ScoreboardService = require('../demo/service');
var weekRotate = 0;

class WeekAward {

	static run(){
		if(weekRotate == 0){
			++weekRotate;
		}else{
			Promise.resolve()
			.then(() => {
				return ScoreboardService.getTopListForWeek()
				.then((res) => {
					return this.prepareRewards(res.list).then(() => {
						console.log("WeekAward done!");
					});
				});
			}).catch((err) => {
				return Promise.reject(err);
			});
		}	
	}

	static prepareRewards(list){
		return ScoreboardService.getTotalScore(list)
		.then((totalMoney) => {
			return list.reduce((p, e) => {
				return p.then(() => {
					return this.addMoneyToUser(e.userId, this.calcPrize(totalMoney, e.rank))
				}).then(() => {
					ScoreboardService.setAwarded(true);
				});
			}, Promise.resolve());
		});		
	}

	static addMoneyToUser(userId, prize){
		return ScoreboardService.modifyUserMoney(userId, prize);
	}

	static calcPrize(totalMoney, userRank){
		if(userRank > 100 || totalMoney < 0) 
			return 0;

		var prize = 0;
		switch (userRank) {
			case 1:
				prize = totalMoney * 0.2;
			break;
			case 2:
				prize = totalMoney * 0.15;
			break;
			case 3:
				prize = totalMoney * 0.1;
			break;
			default:
				prize = totalMoney * 0.55 / 97;
		}
		return parseInt(prize, 10);
	}
}
module.exports = WeekAward;