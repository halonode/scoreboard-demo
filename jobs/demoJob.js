const Promise = require('bluebird');
const mongoose = require('mongoose');
const UserModel = require('../model/UserModel');
const faker = require('faker');
const ScoreboardService = require('../demo/service');

const maxTotalUser = 200;
var curentUsers = 0;
class DemoJob {
	addPlayers(){
		const num = 200;
		const promises = [];
        for (let i = 0; i < num; ++i) {

        	const name = "Player_" + faker.random.number(); 
            const uid = mongoose.Types.ObjectId();
            const randAge = (Math.random() * 55 | 18);

            var player = new UserModel({ userId: uid, userName: name, age: randAge, money: 0 });
            player.save();
            promises.push(ScoreboardService._instance.setScore(uid.toString(), 0) );
        }
        return Promise.all(promises).then(() => {
            curentUsers = curentUsers + num;
        });
	}

	checkTotal(){
		if(curentUsers == maxTotalUser){
			return true;
		}else {
			return false;
		}
	}
}

const demo = new DemoJob();

module.exports.define = function(agenda) {
	agenda.define('demoJob', (job, done) => {
	  (async () => {
	    if(demo.checkTotal()){
	    	agenda.cancel({name: "demoJob"});
	    } else {
	    	await demo.addPlayers();
	    	await job.touch();
	    }
	    //await job.touch();
	  })().then(done, done);
	});
}

module.exports.every = function(agenda) {
  agenda.every('10 seconds', 'demoJob');
}

