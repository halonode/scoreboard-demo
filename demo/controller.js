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

    static clear(req, res) {
        void(req);

        return ScoreboardService.clear()
        .then(() => {
            res.json({});
        });
    }

    static insert(req, res) {
        const num = +req.body.num || 1;

        return ScoreboardService.insertRandom(num)
        .then(() => {
            res.json({});
        });
    }

    static modify(req, res){
        const name = req.body.name || "";
        const delta = +req.body.delta || 1;

        return ScoreboardService.modifyScore(name, delta)
        .then(() => {
            res.json({});
        })
        .catch(() => {
            res.status(400).send('wrong request!');
        });
    }

    static remove(req, res){
        const name = req.body.name || "";
        return ScoreboardService.remove(name)
        .then(() => {
            res.json({});            
        });
        .catch(() => {
            res.status(400).send('wrong request!');
        })
    }
}

module.exports = ScoreboardController;