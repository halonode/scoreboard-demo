"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

// Higher score is better ranking.

const fs = require('fs');
const ScoreboardBase = require('./scoreboardBase');
const moment = require('moment');
const UserModel = require('../model/UserModel');

/**
 * @extends ScoreboardBase
 */
class ScoreboardScoreDesc extends ScoreboardBase {
    /**
     * onGetLuaScripts callback.
     * @protected
     */
    onGetLuaScripts() {
        function __readScript(filename) {
            return fs.readFileSync(__dirname + '/luascripts' + filename, 'utf8')
        }

        const luascripts = {};
        luascripts[ScoreboardBase.lua.getScoreAndRank] = {script: __readScript('/desc/getScoreAndRank.lua') };
        luascripts[ScoreboardBase.lua.getPosition] = {script: __readScript('/desc/getPosition.lua') };
        luascripts[ScoreboardBase.lua.getRange] = {script: __readScript('/desc/getRange.lua') };
        luascripts[ScoreboardBase.lua.getRank] = {script: __readScript('/desc/getRank.lua') };
        luascripts[ScoreboardBase.lua.getUserInfo] = {script: __readScript('/desc/getUserInfo.lua') };
        luascripts[ScoreboardBase.lua.copyKey] = {script: __readScript('/copyKey.lua') };

        return luascripts;
    }

    /**
     * _getUserInfoFromUserId.
     * @private
     */
    _getUserInfoFromUserId(userId) {
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getUserInfo);

        return this.redis.evalshaAsync(luaSha, 1, userId, userId)
        .then((res) => {
            return {
                userId : res[1],
                userName: res[3],
                userAge: res[5],
                score: res[7],
                rankChange: 0
            }
        });
    }


    /**
     * @public
     * setTopListUserInfo
     */
    setTopListUserInfo(userId, userName, userAge, score, rankChange) {
        return this._setTopListUserInfo(
            userId, userName, userAge, score, rankChange);
    }

    /**
     * @private
     * _setTopListUserInfo
     */
    _setTopListUserInfo(userId, userName, userAge, score, rankChange) {
        return this.redis.hmsetAsync(userId, 
            "userId",userId, "userName",userName, 
            "userAge",userAge, "score",score, "rankChange",rankChange);
    }

    /**
    * getTopList
    * @public
    */
    getTopList(size) {
        
        return this._getRange(0, size, this.sbname)
        .then((res) => {
            return this._rangeToList(res.range)
            .then((list) => {
                return this._getTopListWithInfo(list)
                .then((data) => {
                    //console.log(data);
                    return {
                        list:data
                    }
                    
                });
            });
        });
    }

    _getTopListWithInfo(list){
    /*[ { userId: 'Pantheon', score: 998, rank: 1, lastRank: 2 },
     { userId: 'Artemis', score: 997, rank: 2, lastRank: 1 } ] */  

        const res = [];

        return list.reduce((p,e) => {
            return p.then(() => {
                return this._getLastRank(e.userId)
                .then((rank) => {
                    return this._getUserData(e.userId)
                    .then((data) => {
                        //console.log(data);
                        if(data != null){
                            res.push({
                                userId: e.userId,
                                score: e.score,
                                rank: e.rank,
                                rankChange: rank[1] - e.rank,
                                userName: data.userName,
                                userAge: data.age
                                
                            });
                            return res;
                        }
                    });
                });
            });
        }, Promise.resolve()); 
    }


    _getLastRank(userId){
        const yesterday = moment().add(-1, 'days').format("YYYYMMDD");
        return this._getScoreAndRank(userId, yesterday);
    }

    _getUserData(userId){
        return UserModel.findOne({userId: userId}, function(error, data) {
            return data; 
        });
    }


}


module.exports = ScoreboardScoreDesc;