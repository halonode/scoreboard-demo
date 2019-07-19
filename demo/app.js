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

const UserModel = require('../model/UserModel');

const mongoConnectionString = "mongodb://localhost:27017/scoreboarddb";

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

async function dropMongo() {

    return new Promise((resolve, reject) => {
        try {
            const conn = mongoose.connect(mongoConnectionString, {useNewUrlParser: true, useFindAndModify: false });
            //mongoose.set('debug', true);

            UserModel.deleteMany({}, function(err) { 
               console.log('user collection removed'); 
            });

            resolve();
        }
        catch(err) {
            reject(err);
        }
    });
 
}

async function createMongo() {
    //await mongoose.connect(mongoConnectionString, {useNewUrlParser: true, useFindAndModify: false });
    console.log("mongo is ready");
}

function initializeService() {
    return service.initialize(redisCli);
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
    agenda.purge((err, numRemoved) => {
        console.log("Jobs purged: " + numRemoved);
    });

    weekJob.every(agenda);
    dailyJob.every(agenda);

    demoJob.every(agenda);
    demoScoreJob.every(agenda);
    demoEndDayJob.every(agenda);
});

async function startJobs(){
    await agenda.start(); 
    console.log('Agenda connected to mongodb');
}

prepareRedis()
.then(() => {
    return dropMongo();
})
.then(() => {
    return createMongo();
})
.then(() => {
    return startListening();
})
.then(() => {
    return initializeService();
})
.then(() => {
    return startJobs();
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