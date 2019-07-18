//const facade = require('../lib/weekAward');

module.exports.define = function(agenda) {
	agenda.define('dailyJob', (job, done) => {
	  (async () => {
	    //await facade.run();
	    await job.touch();
	  })().then(done, done);
	});
}

module.exports.every = function(agenda) {
  agenda.every('1 day', 'dailyJob');
}

