const facade = require('../lib/weekAward');
const ScoreboardService = require('../demo/service');

var curent = 0;

module.exports.define = function(agenda) {
	agenda.define('weekJob', (job, done) => {
	  (async () => {
	  	console.log("getWeek weekJob " + ScoreboardService.getWeek());
	  	if(ScoreboardService.getWeek() == true && ScoreboardService.getAwarded() == false && ScoreboardService.getDay() == 7){
			await facade.run();
	    	await job.touch();
	  	}
	    
	  })().then(done, done);
	});
}

module.exports.every = function(agenda) {
  agenda.every('15 seconds', 'weekJob');
}

