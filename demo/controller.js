"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const ScoreboardService = require('./service');

class ScoreboardController {
    static register(app) {
        app.get('/', this.list);
        app.post("/clear", this.clear);
        app.post("/insert", this.insert);
        app.post("/modify", this.modify);
        app.post("/remove", this.remove);
    }

    
}

module.exports = ScoreboardController;