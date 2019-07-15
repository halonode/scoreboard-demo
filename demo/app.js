"use strict";

// app.js for demo.
// Copyright (c) 2019 halukdemir https://github.com/halukdemir

const express = require("express");
const app = express();
const path = require("path");
const ejs = require("ejs");
const Promise = require('bluebird');
const redis = Promise.promisifyAll(require('redis'));
const mongoose = Promise.promisifyAll(require('mongoose'));
const bodyParser = require('body-parser');

const controller = require('./controller');
const service = require('./service');

// using body parser.
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// setting views folder.
app.set('views', path.join(__dirname, 'views'));

// using ejs.
app.engine('ejs',ejs.renderFile);

// register controller.
controller.register(app);

let redisCli = null;
let mongoCli = null;

function prepareRedis() {
    // prepare redis.
    return new Promise((resolve, reject) => {
        redisCli = redis.createClient();

        redisCli.on("ready", function () {
            /* eslint-disable no-console */
            console.log("redis ready!");
            /* eslint-enable no-console */
            resolve();
        });
        redisCli.on("error", function (err) {
            reject(err);
        });
    });
}

function prepareMongo() {
    // prepare mongo.
    return new Promise((resolve, reject) => {
        mongoCli = mongoose;
        mongoCli.connect('mongodb://localhost:27017/scoreboarddb', {useNewUrlParser: true});
        mongoCli.connection.on("connected", function () {
            /* eslint-disable no-console */
            console.log("mongo ready!");
            /* eslint-enable no-console */
            resolve();
        });
        mongoCli.connection.on('error', err => {
            reject(err);
        });
        
    });
}

function initializeService() {
    return service.initialize(redisCli, mongoCli);
}

function startListening() {
    // start listening.
    return new Promise((resolve, reject) => {
        try {
            const server = app.listen(8080, function () {
                /* eslint-disable no-console */
                console.log("server on PORT:" + server.address().port);
                /* eslint-enable no-console */
                resolve();
            });
        }
        catch(err) {
            reject(err);
        }
    });
}

prepareRedis()
.then(() => {
    // initialize scoreboard service..
    return prepareMongo();
})
.then(() => {
    return initializeService();
})
.then(() => {
    return startListening();
});