var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var scoreboardSchema = new Schema({
    userId: String,
    score: Number
});

var ScoreboardModel = mongoose.model('users', scoreboardSchema);

module.exports = ScoreboardModel;