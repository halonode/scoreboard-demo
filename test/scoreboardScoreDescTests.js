'use strict';

const assert = require('assert');
const Promise = require('bluebird');
const sinon = require('sinon');
const PrepareRedis = require('./prepareRedis');
const moment = require('moment');

// in this test let's using ScoreboardScoreDesc.
const Scoreboard = require('../index').ScoreboardScoreDesc;

describe('ScoreboardScoreDesc', function () {
    let redis, sandbox;

    before(function () {
        sandbox = sinon.createSandbox();

        return PrepareRedis.prepare()
        .then((_redis) => {
            redis = _redis;
        });
    });

    after(function () {
        PrepareRedis.teardown(redis);
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('test scenario running.', function () {
        let sb;

        before(function () {
            return Scoreboard.create(redis, "sbTest")
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

        beforeEach(function () {
            

            return Promise.all([
                sb.setScore("Artemis", 100),
                sb.setScore("Pantheon", 300),
                sb.setScore("Odin", 200),
                sb.setTopListUserInfo("Odin", "Odin", 25, 400, 0),
                sb.setTopListUserInfo("Artemis", "Artemis", 25, 300, 0),
                sb.setTopListUserInfo("Pantheon", "Pantheon", 25, 500, 0)
            ]).then(() => {
                const yesterday = moment().add(-1, 'days').format("YYYYMMDD");
                return sb._copyKey(yesterday);
                
            });
        });

        afterEach(function () {
            return sb.clear()
        });

		describe('getList', function () {
            it('can we get list with pagination', function () {
                const ghostGetRange = sandbox.spy(sb, "_getRangeAndTotal");

                // get the first page when 3 names in each.
                return sb.getList(1, 3)
                .then((res) => {
                    assert.strictEqual(ghostGetRange.callCount, 1);
                    assert.strictEqual(ghostGetRange.args[0].length, 2);
                    assert.strictEqual(ghostGetRange.args[0][0], 0);
                    assert.strictEqual(ghostGetRange.args[0][1], 2);

                    assert.deepEqual(res, {
                        page: 1,
                        maxPage: 1,
                        total: 3,
                        list: [
                            { userId: 'Pantheon', score: 300, rank: 1 },
                            { userId: 'Odin', score: 200, rank: 2 },
                            { userId: 'Artemis', score: 100, rank: 3 }
                        ]
                    });
                });
            });
        });
       
        
        
            describe('_getUserInfoFromUserId', function () {
                it('can you get info', function () {
                    return Promise.resolve()
                    .then(() => {
                        return sb._getUserInfoFromUserId("Pantheon")
                        .then((res) => {
                            assert.strictEqual(res.userId, "Pantheon");  
                        });

                        return sb._getUserInfoFromUserId("Artemis")
                        .then((res) => {
                            assert.strictEqual(res.score, 100);  
                        });
                        
                    });
                });
            });

            describe('getTopList', function () {
                it('can you get top list', function () {

                return Promise.resolve()
                .then(() => {
                    return sb._modifyScore("Odin", 250)
                    .then(() => {
                        return sb.getTopList(2)
                            .then((res) => {
                                //console.log(res);
                                /*assert.deepEqual(res, {
                                    list: [
                                        { userId: 'Pantheon', userName: 'Pantheon', userAge: 25, score: 300, rankChange: 0 },
                                    ]
                                });
                                */
                         });
                        
                    });
                    
                });    
                
                
                });
            
            });

        


    });

});