var mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
var Schema = mongoose.Schema;

var userSchema = new Schema({
    userId: { type: [String], index: true },
    userName: String,
    age: Number,
    money: Number
});

userSchema.index({
  userId: 1,
}, {
  unique: true,
});

var UserModel = mongoose.model('users', userSchema);

module.exports = UserModel;
