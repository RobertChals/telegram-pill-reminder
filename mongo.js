let mongoose = require('mongoose');

let mongo = {};
module.exports = mongo;

// mongodb setup
let mongoURL = 'mongodb://localhost/pilldb';
mongoose.Promise = global.Promise;
mongoose.connect(mongoURL);

let db = mongoose.connection;

db.on('error', function (err) {
    console.log('db connection error', err);
});

db.once('open', function () {
    console.log('db connected.');
});

// db schemas
let Schema = mongoose.Schema;

let timeslotSchema = new Schema ({
    _id : Number,
    userIDs : [{
        _id: String,
        sentRecently: {type: Boolean, default: true}
    }]}, {collection: 'timeslots'});

let userSchema = new Schema ({
    _id : {type: String, unique: true},
    notificationsActive : {type: Boolean, default: true},
    tzIdentifier : String,
    name: {
        firstName: String,
        lastName: String,
        userName: String
    },
    location : {
        longitude : Number,
        latitude : Number
    }}, {collection: 'users'}
);

// db model
mongo.Timeslot = mongoose.model('Timeslot', timeslotSchema);
mongo.User = mongoose.model('User', userSchema);

// insert Timeslots
mongo.insert = function(Timeslot) {
    for (let j = 0; j <= 1439; j++) {
        let data = new Timeslot({
            _id : j
        });
        data.save();
    }
    console.log("Timeslots inserted");
};
