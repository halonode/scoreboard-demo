const facade = require('../lib/weekAward');

module.exports.define = function(agenda) {
  agenda.define('weekJob', function(job){
    facade.run();
    //console.log('1');
  });
}

module.exports.every = function(agenda) {
  agenda.every('20 seconds', 'weekJob');
}