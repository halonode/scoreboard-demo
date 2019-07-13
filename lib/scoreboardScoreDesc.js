"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

// Higher score is better ranking.

const fs = require('fs');
const ScoreboardBase = require('./scoreboardBase');

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

        return luascripts;
    }
}

module.exports = ScoreboardScoreDesc;