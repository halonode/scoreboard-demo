
const Promise = require('bluebird');
const mongoose = require('mongoose');
const UserModel = require('../model/UserModel');
const ScoreboardService = require('../demo/service');
const faker = require('faker');

const maxTotalDay = 7;
var curentDay = 0;

class DemoEndDayJob {

	run(){
		curentDay = ScoreboardService.getDay();
		++curentDay;
		console.log(curentDay);
		ScoreboardService.setDay(curentDay);
		if(curentDay > 1){
			return ScoreboardService.demoEndDay();
		}
	}

}


const demo = new DemoEndDayJob();

module.exports.define = function(agenda) {
	agenda.define('DemoEndDayJob', (job, done) => {
	  (async () => {
	    
	    if(ScoreboardService.getDay() == 7){
	    	ScoreboardService.setWeek(true);
	    	//console.log("DemoEndDayJob paused" + " currentDay " + ScoreboardService.getDay() + " week " + ScoreboardService.getWeek());
	    }else{
	    	await demo.run();
	    	await job.touch();
	    }
	  })().then(done, done);
	});
}

module.exports.every = function(agenda) {
  agenda.every('30 seconds', 'DemoEndDayJob');
}