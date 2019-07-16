
const Promise = require('bluebird');
const mongoose = require('mongoose');
const ScoreboardService = require('../demo/service');

class WeekAward {
	static run(){
		Promise.resolve()
		.then(() => {
		    return ScoreboardService.marco()
		    .then((res) => {
		        prepareRewards(res.list);
		    });
		}).catch((err) => {
            return Promise.reject(err);
        });
	}

	static prepareRewards(list){
		/* 
		{ list: 
		   [{ userId: '5d2e43d0b2b7d3f26a7bcf0a',
		       score: 898,
		       rank: 99,
		       rankChange: 0,
		       userName: 'player925',
		       userAge: 0 }] 
       } 
       */

	}
}
module.exports = WeekAward;