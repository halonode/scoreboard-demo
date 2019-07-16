var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    userId: String,
    userName: String,
    age: Number,
    money: Number
});



var UserModel = mongoose.model('users', userSchema);

module.exports = UserModel;
