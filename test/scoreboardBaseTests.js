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
        sandbox = sinon.createSandbox();

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

    describe('unit tests using TestScoreboard.', function () {
        // TestScoreboard class for testing.
        class TestScoreboard extends ScoreboardBase {
            onGetLuaScripts(){
                function __readScript(fn){
                    return fs.readFileSync(__dirname + '/../lib/luascripts' + fn, 'utf8') 
                }

                const luascripts = {};
                luascripts[ScoreboardBase.lua.getScoreAndRank] = {script: __readScript('/desc/getScoreAndRank.lua')};

                return luascripts;
            }
        } // TestScoreboard Class

        describe('factory scoreboard', function () {
            it('create board instance', function () {
                const ghostRegister = sandbox.stub(TestScoreboard.prototype, '_registerScript');
                ghostRegister.callsFake(function(){
                    return Promise.resolve();
                });

                return TestScoreboard.create(redis,"TESTBEST")
                .then((instance) => {
                    
                    assert.ok(instance instanceof TestScoreboard);
                    assert.strictEqual(instance._redis, redis);
                    assert.strictEqual(instance._sbname, "TESTBEST");
                    assert.strictEqual(ghostRegister.callCount, 1);
                });
            }); 
        });

        describe('lua script loader', function () {
            let sb;
            before(function () {
                return TestScoreboard.create(redis,"sbTest")
                .then((_sb) => {
                    sb = _sb;
                })
            });

            after(function () {
                return sb.clear()
                .then(() => {
                    
                    return redis.flushdbAsync();
                });
            });

            describe('loaded luascripts on redis', function () {
                it('_scriptSHA', function () {
                    assert.strictEqual(sb._scriptSHA('sb_score_rank'), sb._luascripts.sb_score_rank.sha);
                    assert.strictEqual(sb._scriptSHA('TESTBEST'), null);
                });

                it('_registerScript', function () {
                    const ghostScripts = sandbox.stub(sb, 'onGetLuaScripts');
                    ghostScripts.callsFake(function(){
                        return {
                            test: {
                                script:"123456"
                            }
                        };
                    });

                    let loadCall = 0;
                    const ghostLured = sandbox.stub(lured, 'create');
                    ghostLured.callsFake(function(){
                        return {
                            load: function(cb){
                                ++loadCall;
                                cb(null);
                            }
                        }
                    });

                    return sb._registerScript()
                    .then(() => {
                        
                        assert.strictEqual(ghostScripts.callCount, 1);
                        assert.strictEqual(ghostLured.callCount, 1);
                        assert.strictEqual(ghostLured.args[0].length, 2);
                        assert.strictEqual(ghostLured.args[0][0], sb._redis);
                        assert.strictEqual(ghostLured.args[0][1], sb._luascripts);
                        assert.strictEqual(loadCall, 1);
                        assert.deepEqual(sb._luascripts, {
                            test: {
                                script: "123456"
                            }
                        });
                    });
                });
            });
        });
        
    }); // Unit TestScoreboard 


});
