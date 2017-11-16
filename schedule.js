let schedule = require('node-schedule');
let moment = require('moment');
let mongo = require('./mongo');
let bot = require('./bot');
let messages = require('./messages');

// every minute at 00 seconds
let rule = new schedule.RecurrenceRule();
rule.second = 0;

schedule.scheduleJob(rule, function(){
    let now = moment();
    let time = moment(now, "HH:mm");
    let timeIndex = time.hour() * 60 + time.minute();

    mongo.Timeslot.findOne(
        {'_id': timeIndex},
        function (err, result) {
            if (err) {console.log(err)}
            else {
                let arr = result.userIDs;
                arr.forEach(function(obj) {
                    let chatId = obj._id;
                    let i = Math.floor(Math.random() * messages.pillMessages.length);
                    let pillMsg = messages.pillMessages[i];
                    bot.myBot.sendMessage(chatId, pillMsg);
                })
            }
        }
    )
});

// TODO: schedule job for daylight savings time

getRandomInt = function(min, max, callback) {
    min = Math.ceil(min);
    max = Math.floor(max);
    let result = Math.floor(Math.random() * (max - min)) + min;
    return callback(result);
};
