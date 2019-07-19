
const Promise = require('bluebird');
const mongoose = require('mongoose');
const UserModel = require('../model/UserModel');
const ScoreboardService = require('../demo/service');
const faker = require('faker');

class DemoScoreJob {
	run(){
		if(!ScoreboardService.getWeek()){
			// Get the count of all users
			UserModel.countDocuments().lean().exec(function (err, count) {
		        for (let i = 0; i < 10; ++i) {
		            var random = Math.floor(Math.random() * count);
			        UserModel.findOne().skip(random).lean().exec(
				    function (err, user) {
				    	if(!err){
				    		if(user != null){
				    			ScoreboardService.getTotalScore();
				 				return ScoreboardService.modifyScore(user.userId.toString(), faker.random.number());
				    		}
				    	}
				    });
		        }
			});
		}
	}
}

const demo = new DemoScoreJob();

module.exports.define = function(agenda) {
	agenda.define('DemoScoreJob', (job, done) => {
	  (async () => {
	    await demo.run();
	    await job.touch();
	    
	  })().then(done, done);
	});
}

module.exports.every = function(agenda) {
  agenda.every('5 seconds', 'DemoScoreJob');
}