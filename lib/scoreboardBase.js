"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const _ = require('lodash');
const Promise = require('bluebird');
const lured = require('lured');
const moment = require('moment');
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
    static create(redis, sbname) {
        const Ctor = this;

        const board = new Ctor;
        board._redis = redis;
        board._sbname = sbname;  // scoreboard database name.

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
     * Get scoreboard redis key name.
     * @public
     * @return {string} scoreboard key name.
     * @description getter for _sbname.
     */
    get sbname(){
        return this._sbname;
    }

    /**
     * Get luascripts information.
     * @public
     * @return {Object} luascripts
     * @description getter for _luascripts.
     */
    get luascripts(){
        return this._luascripts;
    }

    /**
     * onGetLuaScripts callback.
     * @protected
     * @return {Object} script object.
     * @description You have to override this function. The default implementation will throw an exception.
     * Do not forget to add static fields of Redis Lua "ScriptsScoreboardBase.lua"
     */
    onGetLuaScripts(){
        throw new Error("Override this!");
    }

    /**
     * _scriptSHA.
     * @private
     * @param {string} tag - _luascripts.key
     * @return {string} sha string to determine which lua script we'll run.
     */
    _scriptSHA(name){
        const sc = this.luascripts[name];
        if(!sc || !sc.sha){
            return null;
        }
        return sc.sha;
    }

    /**
     * _registerScript.
     * @private
     * @return {Promise}
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
     * @private
     * @param {string} name - player id
     * @param {string} dbname - which redis key to get data, this._sbname or yesterday date format (YYYYMMDD)
     * @return {Promise<Array>} - [score, rank]
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
     * @param {string} name - player id
     * @return {Promise<number>} - rank
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
     * _getRange. Players between (start <= players <= end).
     * @private
     * @param {number} start
     * @param {number} end
     * @param {string} redis key
     * @return {Promise<Array>} - e.g.) [ 'Artemis', '300', 'Pantheon', '250', 'Odin', '200']
     */
    _getRange(start, end, dbname) {
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getRange);
        return this.redis.evalshaAsync(luaSha, 1, dbname, start, end)
        .then((res) => {
            return {
                range: res
            };
        });
    }

    /**
     * _getRange. Players between (start <= players <= end) and total numbers of players in the board.
     * @private
     * @param {number} start
     * @param {number} end
     * @return {Promise<Object>} - e.g.) {total: number, range: Array['Pantheon', '300', 'Artemis', '250, ...]}
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
     * @param {number} score - player id
     * @return {Promise<number>} - rank
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
     * @param {Array} range - [ 'Pantheon', '300', 'Odin', '250', 'Artemis', '200' ]
     * @return {Promise<Array>} - e.g.)[ ['Pantheon', 300], ['Odin', 250], ['Artemis', 200] ]
     */
    _rangeToList(range) {
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
     * _settleRank.
     * @private
     * @param {Array} data - [ ['Artemis', 300], ['Odin', 250], ['Pantheon', 200], ...]
     * @return {Promise<Array>} - rank arrays. e.g.)[1, 2, 3...]
     */
    _settleRank(data) {
        let score = null;
        let counter = null;
        let attempt = 0;

        const res = [];
        return data.reduce((p, e) => {
            return p.then(() => {

                //if position only rank, otherwise disable this section!!!
                /*
                return this._getPosition(e[0])
                .then((rank) => {
                    res.push(rank);
                    return res;
                });
                */

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
     * getList.
     * @public
     * @param {number} number - page index starting from 1.
     * @param {number} size - page size. The numbers of players in a page.
     * @return {Promise<Object>} - ```return Promise({Object. see above description});```
     * @description - You can get the list by using this function.
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
     * @param {string} name - player name
     * @param {number} delta - delta to modify the score
     * @return {Promise}
    */
    modifyScore(name, delta) {
        return this._modifyScore(name, delta);
    }

    /**
     * _modifyScore.
     * @private
     * @param {string} name - player name
     * @param {number} delta - delta to modify the score
     * @return {Promise}
     */
    _modifyScore(name, delta) {
        return this.redis.zincrbyAsync(this.sbname, delta, name);
    }


    /**
     * clear.
     * @public
     * @return {Promise}
     */
    clear() {
        return this._clear();
    }

    /**
     * Clear real-time scoreboard and yesterday redis keys.
     * _clear.
     * @private
     * @return {Promise}
     */
    _clear() {
        const yesterday = moment().add(-1, 'days').format("YYYYMMDD");
        return this.redis.delAsync(this.sbname).then(() => { 
            return this.redis.delAsync(yesterday)
            .then(() => {                
                return this.redis.delAsync("weekAwards");
            });
        });
    }


    /**
     * _setScore
     * @public
     * @param {string} name - player id
     * @param {score} number to set the score
     * @return {Promise}
     */
    setScore(name, score) {
        return this._setScore(name, score);
    }

    /**
     * _setScore
     * @private
     * @param {string} name - player id
     * @param {score} number to set the score
     * @return {Promise}
     */
    _setScore(name, score) {
        return this.redis.zaddAsync(this.sbname, score, name).then(() => {
            return this._getLastRank(name)
            .then((rank) => {
                if(rank && rank.length>0) { 
                    return rank;
                }else{
                    return this._setHistoryScore(name, score);
                }
            });
        });
    }

    /**
     * setHistoryScore
     * @public
     * @param {string} name - player id
     * @param {score} number to set the score
     * @return {Promise}
     */
    setHistoryScore(name, score) {
        return this._setHistoryScore(name, score);
    }

    /**
     * _setHistoryScore
     * @private
     * @param {string} name - player id
     * @param {score} number to set the score
     * @return {Promise}
     */
    _setHistoryScore(name, score) {
        const yesterday = moment().add(-1, 'days').format("YYYYMMDD");
        return this.redis.zaddAsync(yesterday, score, name);
    }

    /**
     * _getLastRank
     * @private
     * @param {string} name - player id
     * @return {Promise}
     */
    _getLastRank(userId){
        const yesterday = moment().add(-1, 'days').format("YYYYMMDD");
        return this._getScoreAndRank(userId, yesterday);
    }

     /**
     * count
     * @pubilc
     * @return {Promise}
     */
    count() {
        return this._count();
    }

    /**
     * _count
     * @private
     * @return {Promise}
     */
    _count() {
        return this.redis.zcardAsync(this.sbname);
    }

     /**
     * _remove
     * @private
     * @param {string} name - player id
     * @return {Promise}
     */
    _remove(name) {
        return this.redis.zremAsync(this.sbname, name);
    }

    /**
     * remove
     * @public
     * @param {string} name - player id
     * @return {Promise}
     */
    remove(name) {
        return this._remove(name);
    }

    /**
    * _copyKey
    * @private
    * @param {destination} - copy real-time redis key to destination key
    * @return {Promise}
    */
    _copyKey(destination){
        const luaSha = this._scriptSHA(ScoreboardBase.lua.copyKey);
        return this.redis.evalshaAsync(luaSha, 1, this.sbname, destination);
    }

    /**
    * getTotalScore
    * @public
    * @return {Promise}
    */
    getTotalScore(){
        return this._getTotalScore();
    }

    /**
    * _getTotalScore
    * @private
    * @return {Promise}
    */
    _getTotalScore(){
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getTotalScore);
        return this.redis.evalshaAsync(luaSha, 1, this.sbname, 0, 100);
    }

    /**
    * getNeighbors
    * @public
    * @param {name} - 
    * @param {count} - 
    * @return {Promise}
    */
    getNeighbors(name, count) {
        return this._getPosition(name)
        .then((rank) => {
            if (rank === null) {
                return [];
            }
            // private._getPosition gives us a 0-origin rank.

            let start = (rank - count);
            let end = (rank + count);
            // revise.
            if (start < 0) {
                start = 0;
                end = count << 1;
            }

            return this._getRange(start, end, this.sbname)
            .then((res) => {
                return this._rangeToList(res.range);
            });
        })
        .then((res) => {
            res.pop();
            return {
                list: res
            }
        })
    }

    /**
    * setWeekAward
    * @public
    * @param {userId} - 
    * @param {prize} - 
    * @return {Promise}
    */
    setWeekAward(userId, prize) {
        return this._setWeekAward(userId, prize);
    }

    /**
    * _setWeekAward
    * @private
    * @param {userId} - 
    * @param {prize} - 
    * @return {Promise}
    */
    _setWeekAward(userId, prize) {
        return this.redis.zaddAsync("weekAwards", prize, userId);
    }

    /**
    * getWeekAwards
    * @public
    * @return {Promise<Object>} 
    */
    getWeekAwards(){
        return this._getRange(0, 100, "weekAwards")
        .then((res) => {
            return this._rangeToList(res.range).then((list) => {
                return {
                    list:list
                }
            });            
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
    copyKey: "sb_copy",
    getTotalScore: "sb_total_score"
}

module.exports = ScoreboardBase;