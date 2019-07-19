"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

// Higher score is better ranking.

const fs = require('fs');
const Promise = require('bluebird');
const ScoreboardBase = require('./scoreboardBase');
const UserModel = require('../model/UserModel');
const _ = require('lodash');


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
        luascripts[ScoreboardBase.lua.getTotalScore] = {script: __readScript('/desc/getTotalScore.lua') };
        luascripts[ScoreboardBase.lua.copyKey] = {script: __readScript('/copyKey.lua') };

        return luascripts;
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
                    return {
                        list:data
                    }
                });
            });
        });
    }

    getTopListWithNeighbors(userId, listSize){



        const count = 3;
        return this.getNeighbors(userId, count)
        .then((bors) => {
            return this._getTopListWithInfo(bors.list)
            .then((data) => {
                return this.getTopList(listSize).then((list) => {
                    //_.assign(list.list, data);
                    //_.orderBy(list.list, ['rank'], ['asc']);
                    return {list:list.list, dist:data}
                });
            });
            
        });

        

        /*
        */
    }

    /**
    * _getTopListWithInfo
    */
    _getTopListWithInfo(list){
    /*[ { userId: 'Pantheon', score: 998, rank: 1, rankChange: 2 },
     { userId: 'Artemis', score: 997, rank: 2, rankChange: -1 } ] */  

        const res = [];

        return list.reduce((p,e) => {
            return p.then(() => {
                return this._getLastRank(e.userId)
                .then((rank) => {
                    return this._getUserData(e.userId)
                    .then((data) => {
                        var r = 0;
                        if(rank && rank.length>0) {
                            r =  rank[1] - e.rank;
                        }
                        res.push({
                            userId: e.userId,
                            score: e.score,
                            rank: e.rank,
                            rankChange: r,
                            userName: data.userName,
                            userAge: data.age
                            
                        });
                        return res;
                    });
                });
            });
        }, Promise.resolve()); 
    }
    
    /**
    * _getUserData
    */
    _getUserData(userId){
        return UserModel.findOne({userId: userId}).lean().exec();
    }


}


module.exports = ScoreboardScoreDesc;