const schedule = require('node-schedule');
const moment = require('moment');
const mongo = require('./mongo');
const bot = require('./bot');
const messages = require('./messages');

exports.initScheduler = () => {

    // every minute at 00 seconds
    let rule = new schedule.RecurrenceRule();
    rule.second = 0;

    schedule.scheduleJob(rule, () => {
        let now = moment();
        let time = moment(now, "HH:mm");
        let timeIndex = time.hour() * 60 + time.minute();

        mongo.Timeslot.findOne(
            {'_id': timeIndex},
            function (err, result) {
                if (err) {
                    console.log(err)
                }
                else {
                    let arr = result.userIDs;
                    arr.forEach(async (obj) => {
                        let chatId = obj._id;
                        let i = Math.floor(Math.random() * messages.pillMessages.length);
                        let pillMsg = messages.pillMessages[i];
                        await bot.sendMessage(chatId, pillMsg);
                    })
                }
            }
        )
    })
};

// TODO: schedule job for daylight savings time
