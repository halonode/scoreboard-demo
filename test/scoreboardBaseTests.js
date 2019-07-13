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
                luascripts[ScoreboardBase.lua.getPosition] = {script: __readScript('/desc/getPosition.lua') };

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
                    assert.strictEqual(sb._scriptSHA('sb_pos'), sb._luascripts.sb_pos.sha);
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
                }); //_registerScript
            });
        }); //lua script loader

    describe('unit testing methods', function () {
        let sb;
        before(function () {
            return TestScoreboard.create(redis,"sbTest")
            .then((_sb) => {                
                sb = _sb;
            });
        });

        after(function () {
            return sb.clear()
            .then(() => {                
                return redis.flushdbAsync();
            });
        });

        beforeEach(function() {
            return Promise.all([
                sb.setScore("Odin",400),
                sb.setScore("Artemis",300),
                sb.setScore("Pantheon",500)
            ]);
        });

        afterEach(function(){
            return sb.clear()
        });

        describe('unit testing protected methods', function () {
            
            describe('_clear', function () {
                it('are you ok', function () {
                    return sb._clear()
                    .then(() => {
                        
                        return sb._count()
                        .then((count) => {
                            
                            assert.strictEqual(count, 0);
                        });
                    });
                });
            }); // _clear


            describe('_count', function () {
                it('are you 3', function () {
                    return sb._count()
                    .then((count) => {
                        assert.strictEqual(count, 3);                        
                    });
                });
            }); // _count

            describe('_remove', function () {
                it('can you remove', function () {
                    return sb._remove("Artemis")
                    .then(() => {
                        return sb._count()
                        .then((count) => {
                            assert.strictEqual(count, 2);
                            return sb._getPosition("Artemis")
                        })
                        .then((res) => {
                            // Artemis is gone...
                            assert.strictEqual(res, null);
                            
                        });
                    });
                });
            }); // _remove

            describe('_setScore', function () {
                it('is score setter good', function () {
                    return Promise.resolve()
                    .then(() => {
                        return sb._setScore("Eve", 10)
                        .then(() => {
                            return sb._getScoreAndRank("Eve")              
                        })
                        .then((res) => {
                            assert.strictEqual(res[0], 10)
                            return sb._count();
                        })
                        .then((count) => {
                            assert.strictEqual(count, 4);                            
                        });
                        
                    })
                    .then(() => {
                        return sb._setScore("Eve", 20)
                        .then(() => {
                            return sb._getScoreAndRank("Eve")
                            
                        })
                        .then((res) => {
                            assert.strictEqual(res[0], 20);
                            return sb._count();                            
                        })
                        .then((count) => {
                            assert.strictEqual(count, 4);                            
                        });
                        
                    });
                });
            }); //_setScore

            describe('_modifyScore', function () {
                it('case positive', function () {
                    return sb._modifyScore("Odin", 50)
                    .then(() => {
                        return sb._getScoreAndRank("Odin")
                        .then((res) => {
                             assert.strictEqual(res[0], 450);                            
                        });
                        
                    });
                });

                it('case negative', function () {
                    return sb._modifyScore("Artemis", -50)
                    .then(() => {
                        return sb._getScoreAndRank("Artemis")
                        .then((res) => {
                            assert.strictEqual(res[0], 250);                            
                        });                        
                    });
                });
            });

            

        }); // unit testing protected methods


        describe('unit testing public methods', function () {
            
        });

    });

        
    }); // Unit TestScoreboard 


});
