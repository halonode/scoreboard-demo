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

    describe('Exception unless onGetLuaScripts overridden.', function () {
        it('test onGetLuaScripts override on load!.', function () {
            return ScoreboardBase.create(redis, "sbTest")
            .then(() => {
                assert.ok(false);   // should not come here.
            })
            .catch((err) => {
                assert.ok(true);    // should come here!
                assert.strictEqual(err.message, "Override this!");
            });
        });
    });

    

        


    });