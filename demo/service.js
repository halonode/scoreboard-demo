"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const Promise = require('bluebird');
const Scoreboard = require('../index').ScoreboardScoreDesc;
const moment = require('moment');
const UserModel = require('../model/UserModel');


const pageSize = 100;
const listSize = 99;

class ScoreboardService {
    static initialize(redis) {
        return Scoreboard.create(redis, "sbTest")
        .then((_sb) => {
            this._instance = _sb;
            this._nameSeed = 1;
            this._instance._clear();
        });
    }

    static getTopList() {

        if(this.getPlayer() != null){
            return this._instance._getPosition(this.getPlayer().toString())
            .then((rank) => {
                if(rank == null || rank < 100){
                    return this._instance.getTopList(listSize);
                }else{
                    return this._instance.getTopListWithNeighbors(this.getPlayer().toString(), listSize);
                }
            });
        }else{
            return this._instance.getTopList(listSize);
        }
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

        return this._instance.getTotalScore()
        .then((total) => {
            return ScoreboardService._total = total;
        });
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

    static setPlayer(n){
         this._player = n;
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

    static getPlayer(){
        return this._player;
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
        console.log(yesterday);
        return this._instance._copyKey(yesterday);
    }

    static pickAndSetDemoPlayer(){
        return Promise.resolve()
        .then(() => {
            UserModel.countDocuments().lean().exec(function (err, count) {
                var random = Math.floor(Math.random() * count);
                UserModel.findOne().skip(random).lean().exec(
                function (err, user) {
                    if(user){
                        ScoreboardService._player = user.userId;
                    }
                });
            });
        });
    }

    static cb(err, found){
        console.log(err);
        console.log(found);
    }

}



// static fields.
ScoreboardService._instance = null;
ScoreboardService._nameSeed = 1;
ScoreboardService._day = 0;
ScoreboardService._weekEnd = false;
ScoreboardService._awarded = false;
ScoreboardService._player = null;
ScoreboardService._total = null;

module.exports = ScoreboardService;