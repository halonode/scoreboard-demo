"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const Promise = require('bluebird');
const Scoreboard = require('../index').ScoreboardScoreDesc;
const mongoose = require('mongoose');
const moment = require('moment');

const UserModel = require('../config/UserModel');


const pageSize = 100;
const listSize = 100;

class ScoreboardService {
    static initialize(redis, mongo) {
        return Scoreboard.create(redis, "sbTest", mongo)
        .then((_sb) => {
            this._instance = _sb;
            this._nameSeed = 1;

            return this._instance.clear()
            .then(() => {
                // Insert 10 * pageSize users to the board.
                return this.insertRandom(pageSize * 10);
            }).then(() => {
                const yesterday = moment().add(-1, 'days').format("YYYYMMDD");
                return this._instance._copyKey(yesterday);
            });;
        });
    }

    static playerCreate(name, age, money, score, cb) {
      const uid = mongoose.Types.ObjectId();
      var player = new UserModel({ userId: uid,userName: name, age: age,money: money });
           
      player.save(function (err) {
        if (err) {
          console.error(err);
          return;
        }
        return uid;
        //console.log('New player: ' + player);
        //cb(null, player);
      } );
    }

    static getTopList() {
        return this._instance.getTopList(listSize);
    }

    static getList(page) {
        return this._instance.getList(page, pageSize);
    }

    static insertRandom(num) {

        mongoose.connection.db.listCollections({name: 'users'})
        .next(function(err, collinfo) {
            if (collinfo) {
                UserModel.collection.drop();
            }
        });

        
        const promises = [];
        for (let i = 0; i < num; ++i) {
            const name = 'player' + ScoreboardService._nameSeed++;
            const score = (Math.random() * 1000 | 0);
            const uid = mongoose.Types.ObjectId();
            var player = new UserModel({ userId: uid, userName: name, age: 0, money: 0 });
            player.save();
            promises.push(this._instance.setScore(this._instance.sbname, uid.toString(), score));
            //promises.push(this._instance.setTopListUserInfo(name, name, 25, score, 2));
            //promises.push(this.playerCreate(name, 0, 0, score));
        }
        return Promise.all(promises);
    }

    static clear() {
        return this._instance.clear();
    }

    static remove(name){
        return this._instance.remove(name);
    }

    static modifyScore(name, delta) {
        return this._instance.modifyScore(name, delta);
    }

}

// static fields.
ScoreboardService._instance = null;
ScoreboardService._nameSeed = 1;

module.exports = ScoreboardService;