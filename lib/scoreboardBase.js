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
}

module.exports = ScoreboardBase;