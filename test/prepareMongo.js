'use strict';

const Promise = require('bluebird');
const mongoose = Promise.promisifyAll(require('mongoose'));

function prepareMongo() {

     return new Promise((resolve, reject) => {
        const client  = mongoose;
        client.connect('mongodb://localhost:27017/scoreboarddb', {useNewUrlParser: true});
        client.connection.on("connected", function () {
            /* eslint-disable no-console */
            console.log("mongo ready!");
            /* eslint-enable no-console */
            resolve(client);
        });
        client.connection.on('error', err => {
            reject(err);
        });
        
    })
}

function teardownMongo(client) {
    client.connection.close();
}

module.exports = {
    prepare: prepareMongo,
    teardown: teardownMongo
};