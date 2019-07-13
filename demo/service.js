"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const Promise = require('bluebird');
const Scoreboard = require('../index').ScoreboardScoreDesc;

const pageSize = 10;

class ScoreboardService {
    static initialize(redis) {
        return Scoreboard.create(redis, "sbTest")
        .then((_sb) => {
            this._instance = _sb;
            this._nameSeed = 1;

            return this._instance.clear()
            .then(() => {
                // Insert 10 * pageSize users to the board.
                return this.insertRandom(pageSize * 10);
            });
        });
    }

    
}

// static fields.
ScoreboardService._instance = null;
ScoreboardService._nameSeed = 1;

module.exports = ScoreboardService;