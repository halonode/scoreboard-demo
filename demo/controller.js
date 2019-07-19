"use strict";

// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const ScoreboardService = require('./service');

class ScoreboardController {
    

    static register(app) {
        app.get('/', this.list);
        app.get('/toplist', this.topList);
        app.post("/clear", this.clear);
        app.post("/modify", this.modify);
        app.post("/remove", this.remove);

        app.post("/resetWeek", this.resetWeek);
        app.post("/pickPlayer", this.pickPlayer);
    }

    static topList(req, res) {
        return ScoreboardService.getTopList()
        .then((list) => {
            return ScoreboardService.getWeekAwards()
            .then((awards) => {

                if(list.list == null){
                    res.redirect('/'); 
                }else{
                    res.render('topList.ejs', {
                        list: list.list,
                        playerList: list.dist,
                        day: ScoreboardService.getDay(),
                        weekEnd: ScoreboardService.getWeek(),
                        awarded: ScoreboardService.getAwarded(),
                        weekAwards: awards.list,
                        player: ScoreboardService.getPlayer(),
                        totalPrize: ScoreboardService._total
                    });
                }
            });
            
        });
    }

    static list(req, res) {
        const page = +req.query.page || 1;

        return ScoreboardService.getList(page)
        .then((list) => {
            res.render('index.ejs', {
                page: list.page,
                maxPage: list.maxPage,
                total: list.total,
                list: list.list
            });
        });
    }

    static clear(req, res) {
        void(req);

        return ScoreboardService.clear()
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
        })
        .catch(() => {
            res.status(400).send('wrong request!');
        });
    }

    static polo (){
        console.log("marco");
        return true;
    }

    static resetWeek(req, res){
        void(req);
        return ScoreboardService.resetWeek()
        .then(() => {
            res.json({});
        });
    }

    static pickPlayer(req, res){
        void(req);
        return ScoreboardService.pickAndSetDemoPlayer()
        .then(() => {
            res.json({});
        });
    }
}

module.exports = ScoreboardController;