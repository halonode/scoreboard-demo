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
const Agenda = require('agenda');
const weekJob = require('../jobs/weekJob.js');
const dailyJob = require('../jobs/dailyJob.js');

const demoJob = require('../jobs/demoJob.js');
const demoScoreJob = require('../jobs/demoScoreJob.js');
const demoEndDayJob = require('../jobs/demoEndDayJob.js');



const mongoConnectionString = "mongodb://localhost:27017/scoreboarddb";

// define weekly job
const agenda = new Agenda({
  db: {
    address: mongoConnectionString,
    options: {
      useNewUrlParser: true,
    },
  }, maxConcurrency: 5, defaultConcurrency: 5
});


weekJob.define(agenda);
dailyJob.define(agenda);

//demo simulate
demoJob.define(agenda);
demoScoreJob.define(agenda);
demoEndDayJob.define(agenda);

agenda.on('ready', function(){
  console.log('Agenda connected to mongodb');
  weekJob.every(agenda);
  dailyJob.every(agenda);

  demoJob.every(agenda);
  demoScoreJob.every(agenda);
  demoEndDayJob.every(agenda);
  agenda.purge();
  agenda.start();
});



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
        mongoCli.connect(mongoConnectionString, {useNewUrlParser: true, useFindAndModify: false });
        mongoCli.connection.on("connected", function () {
            /* eslint-disable no-console */
            console.log("mongo ready!");
            mongoCli.connection.collections['users'].drop( function(err) {
                console.log('collection dropped');
                reject(err);
            });
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

/*
function graceful() {
  console.log('Stoping agenda!');
  agenda.stop(function() {
    process.exit(0);
  });
}

process.on('SIGTERM', graceful);
process.on('SIGINT' , graceful);
*/