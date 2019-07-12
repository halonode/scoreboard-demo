'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs');
const sinon = require('sinon');
const lured = require('lured');
const PrepareRedis = require('./prepareRedis');
const ScoreboardBase = require('../index').ScoreboardBase;

describe('ScoreboardBase', function () {
    let redis, sandbox;

    before(function () {
        sandbox = sinon.sandbox.create();

        return PrepareRedis.prepare()
        .then((_redis) => {
            redis = _redis;
        });
    });

    after(function () {
        // teardown.
        PrepareRedis.teardown(redis);
    });

    afterEach(function () {
        sandbox.restore();
    });
});