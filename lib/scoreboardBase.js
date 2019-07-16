"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const _ = require('lodash');
const Promise = require('bluebird');
const lured = require('lured');

//const UserModel = require('../model/UserModel');

/**
 * base class for Scoreboard.
 * 
 */
class ScoreboardBase {
    /**
     * Create scoreboard. This is a static factory method.
     * @public
     * @param {Object} redis - the instance of redis client
     * @param {string} sbname - scoreborad name. Would be used as a redis key.
     * @return {Promise<Object>} - scoreboard instance.
     */
    static create(redis, sbname, mongo) {
        const Ctor = this;

        const board = new Ctor;
        board._redis = redis;
        board._sbname = sbname;  // scoreboard database name.
        board._mongo = mongo; // mongoose with connection

        return board._registerScript()
        .then(() => {
            return board;
        });
    }

    /**
     * Get redis client.
     * @public
     * @return {Object} redis-client.
     * @description getter for _redis.
     */
    get redis() {
        return this._redis;
    }

    /**
    * sbname
    */
    get sbname(){
        return this._sbname;
    }

    get mongo() {
        return this._mongo;
    }

    /**
    *
    */
    get luascripts(){
        return this._luascripts;
    }

    /**
    * onGetLuaScripts
    */
    onGetLuaScripts(){
        throw new Error("Override this!");
    }

    /**
    * _scriptSHA
    */
    _scriptSHA(name){
        const sc = this.luascripts[name];
        if(!sc || !sc.sha){
            return null;
        }
        return sc.sha;
    }

    /**
    * _registerScript
    */
    _registerScript(){
        return Promise.resolve()
        .then(() => {
            this._luascripts = this.onGetLuaScripts();

            const _lured = lured.create(this.redis, this._luascripts);
            return Promise.promisify(_lured.load).call(_lured);
        })
        .catch((err) => {
            return Promise.reject(err);
        });
    }


    /**
     * _getScoreAndRank.
     */
    _getScoreAndRank(name, dbname) {
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getScoreAndRank);

        return this.redis.evalshaAsync(luaSha, 1, dbname, name)
        .then((res) => {
            if (res[0]) {
                return [
                    parseInt(res[0], 10),
                    res[1] + 1
                ];
            }
            return null;
        });
    }

    /**
     * _getPosition.
     * @private
     */
    _getPosition(name) {
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getPosition);

        return this.redis.evalshaAsync(luaSha, 1, this.sbname, name)
        .then((rank) => {
            if (typeof rank === 'number') {
                return rank;    // 0 origin.
            }
            return null;
        });
    }

    /**
     * _getRange Players between (start <= players <= end)
     * @private
     */
    _getRange(start, end, dbname) {
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getRange);

        // [ 'Pantheon', '500', 'Odin', '400', 'Artemis', '300' ]
        return this.redis.evalshaAsync(luaSha, 1, dbname, start, end)
        .then((res) => {
            return {
                range: res
            };
        });
    }

    /**
     * _getRange and total numbers of players in scoreboard.
     * @private
     */
    _getRangeAndTotal(start, end) {
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getRange);

        return this.redis.multi()
        .zcard(this.sbname)
        .evalsha(luaSha, 1, this.sbname, start, end)
        .execAsync()
        .then((res) => {
            return {
                total: res[0],
                range: res[1]
            };
        });
    }

    /**
     * _getScoreAndRank.
     * @private
     */
    _getRankFromScore(score) {
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getRank);

        return this.redis.evalshaAsync(luaSha, 1, this.sbname, score)
        .then((count) => {
            return count + 1;
        });
    }


    /**
     * _rangeToList.
     * @private
    */
    _rangeToList(range) {
        // range output
        // [ 'Pantheon', '300', 'Odin', '250', 'Artemis', '200' ]
        // group output
        // [ ['Pantheon', 300], ['Odin', 250], ['Artemis', 200] ]

        let index = 0;
        const obj = _.groupBy(range, (_) => {
            void(_);
            return index++ >> 1;
        });
        range = _.toArray(obj).map((e) => {
            return [e[0], +e[1]];
        });

        //return range;
        // settle rankings.
        return this._settleRank(range)
        .then((ranks) => {
            // zipping range and rank.
            const zipped = _.zipWith(range, ranks, (range, rank) => {
                return {
                    userId: range[0],
                    score: range[1],
                    rank: rank
                };
            });

            // re-order.
            return _.orderBy(zipped, ['rank', 'userId'], ['asc', 'asc']);
        })
    }

    /**
     * _settleRank
     * @private
     */
    _settleRank(data) {
        let score = null;
        let counter = null;
        let attempt = 0;

        const res = [];
        return data.reduce((p, e) => {
            return p.then(() => {
                const _score = e[1];
                // same score. Then let's just push the same one before.
                if (_score === score) {
                    res.push(_.last(res));
                    if (counter !== null) {
                        ++counter;
                    }
                    return res;
                }

                score = _score;

                // if local counter has valid number,
                // then we can use it instead of hitting redis.
                if (counter !== null) {
                    res.push(++counter);
                    return res;
                }

                return this._getRankFromScore(_score)
                .then((rank) => {
                    res.push(rank);
                    if (++attempt >= 2) {
                        // after second attempt to hit redis,
                        // we can now using local counter to fix the rank.
                        counter = rank;
                    }
                    return res;
                });
            });
        }, Promise.resolve());
    }

    /**
    * getList
    * @public
    */
    getList(number, size) {
        number = Math.max(0, number - 1);
        size = Math.max(size, 1);

        const start = size * number;
        const end = start + size - 1;

        return this._getRangeAndTotal(start, end)
        .then((res) => {
            return this._rangeToList(res.range)
            .then((list) => {
                return {
                    page: parseInt(number) + 1,
                    maxPage: Math.ceil(res.total / size),
                    total: res.total,
                    list: list
                };
            });
        });
    }


     /**
     * modifyScore.
     * @public
     */
    modifyScore(name, delta) {
        return this._modifyScore(name, delta);
    }

    /**
     * _modifyScore.
     * @private
     */
    _modifyScore(name, delta) {
        return this.redis.zincrbyAsync(this.sbname, delta, name);
    }


    /**
     * @public
     * clear
     */
    clear() {
        return this._clear();
    }

    /**
     * @private
     * _clear
     */
    _clear() {
        return this.redis.delAsync(this.sbname);
    }


    /**
     * @public
     * setScore
     */
    setScore(name, score) {
        return this._setScore(name, score);
    }

    /**
     * @private
     * _setScore
     */
    _setScore(name, score) {
        return this.redis.zaddAsync(this.sbname, score, name);
    }

     /**
     * count
     * @pubilc
     */
    count() {
        return this._count();
    }

    /**
     * _count
     * @private
     */
    _count() {
        return this.redis.zcardAsync(this.sbname);
    }

     /**
     * _remove
     * @private
     */
    _remove(name) {
        return this.redis.zremAsync(this.sbname, name);
    }

    /**
     * remove
     * @public
     */
    remove(name) {
        return this._remove(name);
    }

    /**
    * _copyKey
    */
    _copyKey(destination){
        const luaSha = this._scriptSHA(ScoreboardBase.lua.copyKey);
        return this.redis.evalshaAsync(luaSha, 1, this.sbname, destination);
    }
    
    /**
    * _clearMongo
    */
    _clearMongo(){
        return this.mongo.connection.collections['users'].drop( function(err) {
            console.log('collection dropped');
        });
    }

}

 //static fields of Redis Lua Scripts
ScoreboardBase.lua = {
    getScoreAndRank: "sb_score_rank",
    getPosition: "sb_pos",
    getRange: "sb_range",
    getRank: "sb_rank",
    getUserInfo: "sb_user_info",
    copyKey: "sb_copy"
}

module.exports = ScoreboardBase;