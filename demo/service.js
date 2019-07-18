"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const Promise = require('bluebird');
const Scoreboard = require('../index').ScoreboardScoreDesc;
const moment = require('moment');
const UserModel = require('../model/UserModel');


const pageSize = 100;
const listSize = 99;

class ScoreboardService {
    static initialize(redis, mongo) {
        return Scoreboard.create(redis, "sbTest", mongo)
        .then((_sb) => {
            this._instance = _sb;
            this._nameSeed = 1;
            this._instance._clearMongo();

            return this._instance.clear();
        });
    }

    static getTopList() {
        return this._instance.getTopList(listSize);
    }

    static getWeekAwards() {
        return this._instance.getWeekAwards();
    }

    static getList(page) {
        return this._instance.getList(page, pageSize);
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

    static getTopListForWeek(){
        return this.getTopList();
    }
    
    static getTotalScore(){
        return this._instance.getTotalScore();
    }

    static modifyUserMoney(uId, prize){
        return Promise.resolve()
        .then(() => {
            return this._instance._setWeekAward(uId, prize)
            .then(() => {
                //console.log(prize);
                return UserModel.findOneAndUpdate({ userId: uId }, { $inc: { money: prize }});
            });
        });
    }

    //simulation
    static resetWeek(){
        return this._instance.clear()
        .then(() => {
            this.setDay(1);
            this.setWeek(false);
            this.setAwarded(false);

            console.log(this.getDay());
            console.log(this.getWeek());
            console.log(this.getAwarded());
        });
    }

    static setDay(n){
         this._day = n;
    }

    static setWeek(n){
         this._weekEnd = n;
    }

    static setAwarded(n){
         this._awarded = n;         
    }

    static getDay(){
         return this._day;
    }

    static getWeek(){
         return this._weekEnd;
    }

    static getAwarded(){
         return this._awarded;         
    }

    static demoEndDay(){
        const yesterday = moment().add(-1, 'days').format("YYYYMMDD");
        return this._instance._copyKey(yesterday);
    }

    static pickPlayer(){

    }

}



// static fields.
ScoreboardService._instance = null;
ScoreboardService._nameSeed = 1;
ScoreboardService._day = 1;
ScoreboardService._weekEnd = false;
ScoreboardService._awarded = false;

module.exports = ScoreboardService;