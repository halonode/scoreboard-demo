"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const _ = require('lodash');
const Promise = require('bluebird');
const lured = require('lured');

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

        // add daily scope date like scoreboard_20190715
        // 
        board._sbname = sbname;  // database name.

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
    *
    */
    get sbname(){
        return this._sbname;
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
    _getScoreAndRank(name) {
        const luaSha = this._scriptSHA(ScoreboardBase.lua.getScoreAndRank);

        return this.redis.evalshaAsync(luaSha, 1, this.sbname, name)
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

}

 //static fields of Redis Lua Scripts
ScoreboardBase.lua = {
    getScoreAndRank: "sb_score_rank",
    getPosition: "sb_pos"
}

module.exports = ScoreboardBase;