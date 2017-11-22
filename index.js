const bot = require('./bot');
const mongo = require('./mongo');
const moment = require('moment');
const timezone = require('./timezone');
const messages = require('./messages');

const { initScheduler } = require('./schedule');
initScheduler();

// add time
bot.onText(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/i, (msg) => {
    let chatId = msg.chat.id;
    getTZidentifier(chatId, async (result) => {
        if (result === null) {
            let replyMarkup = {reply_markup: JSON.stringify({
                keyboard : [[{text: messages.sendMyLoc, request_location: true}]]
            })};
            await bot.sendMessage(chatId, messages.errorLocationNeeded +
                "Then tell me your time again.", replyMarkup);
        } else {
            let timeEntered = msg.text;
            let time = moment(timeEntered, "HH:mm");
            if (time.isValid()) {
                let tzIdent = result.tzIdentifier;
                let userOffset = timezone.getOffset(tzIdent);
                time.add(userOffset, 'minutes');

                let timeIndex = time.hour() * 60 + time.minute();

                mongo.Timeslot.update(
                    {_id: timeIndex, 'userIDs._id': {$ne: chatId}},
                    {$push: {"userIDs":{
                        _id: chatId
                    }}},
                    async (err, numAffected) => {
                        if (err) {console.log(err)}
                        else {
                            if (numAffected.n !== 0)
                                await bot.sendMessage(chatId, messages.successAdded + timeEntered);
                            else {
                                await bot.sendMessage(chatId, messages.hintTimeKnown)
                            }
                        }
                    }
                )
            } else {
                await bot.sendMessage(chatId, messages.errorTimeNotRecognized);
            }
        }
    })
});

//times
bot.onText(/^\/times$/i, (msg) => {
    let chatId = msg.chat.id;
    getUserTimes(chatId, async (results) => {
        if (results !== null) {
            await bot.sendMessage(chatId,
                messages.hintWillRemind +
                results.join('\n') +
                messages.hintAddOrDeleteTimes
            );
        }
    })
});

// start
bot.onText(/^\/start$/i, (msg) => {
    saveOrUpdateUserToDb(msg, async () => {
        let chatId = msg.chat.id;
        let firstName = msg.from.first_name;
        let welcomeMessage = "Welcome " + firstName + "!" + messages.startLocation;
        let replyMarkup = {reply_markup: JSON.stringify({
            keyboard : [[{text: messages.sendMyLoc, request_location: true}]]
        })};
        await bot.sendMessage(chatId, welcomeMessage, replyMarkup);
    })
});

// help
bot.onText(/\/help/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, messages.generalMessage + messages.helpMessage);
});

// settings
bot.onText(/\/settings/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, messages.helpMessage);
});

// ping
bot.onText(/^(\/)?ping$/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "pong");
});

// hallo
bot.onText(/^hi|h([ae])llo|hey|hola|seas|servus */i, async (msg) => {
    let chatId = msg.chat.id;
    let firstName = msg.from.first_name;
    await bot.sendMessage(chatId, "Hello " + firstName + "!");
});

// add
bot.onText(/^\/add$/i, (msg) => {
    let chatId = msg.chat.id;
    getTZidentifier(chatId, async (result) => {
        if (result === null) {
            let replyMarkup = {reply_markup: JSON.stringify({
                keyboard : [[{text: messages.sendMyLoc, request_location: true}]]
            })};
            await bot.sendMessage(chatId, messages.errorLocationNeeded, replyMarkup);
        } else {
            await bot.sendMessage(chatId, messages.hintExamples);
        }
    })
});

// remove
bot.onText(/^\/remove$/i, (msg) => {
    let chatId = msg.chat.id;
    getUserTimes(chatId, async (results) => {
        if (results !== null) {
            results.forEach((string, index) => {
                results[index] = "✘ " + string;
            });
            let replyMarkup = {reply_markup: JSON.stringify({
                keyboard : [results]
            })};
            await bot.sendMessage(chatId, messages.whatTimeToRemove, replyMarkup);
        }
    })
});

// remove timeslot
bot.onText(/^✘ ([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/i, (msg) => {
    let chatId = msg.chat.id;
    let replyRemove = {reply_markup: JSON.stringify({
        remove_keyboard : true,
        selective: true
    })};
    let strArr = msg.text.split(" ");
    let timeEntered = strArr[1];
    let time = moment(timeEntered, "HH:mm");
    if (time.isValid()) {
        mongo.User.findOne({'_id': chatId}, (err, result) => {
            if (err) console.log(err);
            else {
                let tzIdent = result.tzIdentifier;
                if (tzIdent === null) {
                    // should not happen
                    console.log("tzIdent error");
                } else {
                    let userOffset = timezone.getOffset(tzIdent);
                    time.add(userOffset, 'minutes');
                    let timeIndex = time.hour() * 60 + time.minute();

                    // see if exists, only then pull from array
                    mongo.Timeslot.findOne(
                        {"_id": timeIndex, "userIDs._id": chatId},
                        async (err, result) => {
                            if (result !== null) {
                                mongo.Timeslot.updateOne(
                                    {_id: timeIndex},
                                    {$pull: {userIDs: {_id: chatId}}},

                                    async (err, numAffected) => {
                                        // for some reason numAffected returns 1 even if no element is affected
                                        if (err) console.log(err + '\n' + numAffected);
                                        else {
                                            await bot.sendMessage(chatId, messages.successRemoved + timeEntered,
                                                replyRemove);
                                        }
                                    });
                            } else {
                                await bot.sendMessage(chatId, messages.errorDeletingTimeEntry, replyRemove)
                            }
                        }
                    )
                }
            }
        })
    }
});

bot.on('location', async (msg) => {
    let chatId = msg.chat.id;
    let replyRemove = {reply_markup: JSON.stringify({
        remove_keyboard : true,
        selective: true
    })};

    await bot.sendChatAction(chatId, "find_location");

    let loc = {
        longitude: msg.location.longitude,
        latitude: msg.location.latitude
    };

    // first time user in onboard process
    let firstTimeUser = false;
    getTZidentifier(chatId, (result) => {
        if (result === null) {firstTimeUser = true}
    });

    // Google Time Zone API Call
    timezone.googleGetTZidentifier(loc, async (tzIdent) => {
        if (tzIdent !== undefined) {
            mongo.User.findByIdAndUpdate(
                chatId,
                {$set: {location: loc, tzIdentifier: tzIdent}},
                {new: true},
                (err, model) => {
                    if (err) console.log(err + '\n' + model);
                }
            );

            await bot.sendMessage(chatId, messages.tellUserNewLocation + tzIdent, replyRemove);
            if (firstTimeUser) {
                await bot.sendMessage(chatId, messages.onboardingSuccess +
                    messages.helpMessage + messages.helpAgainMessage, replyRemove);
            }

        } else {
            await bot.sendMessage(chatId, messages.errorInvalidLocation);
        }

        // TODO: shift all user's times to new offset if user updates his location

    });
});

// string location
bot.onText(/^\/location$/i, (msg) => {
    let chatId = msg.chat.id;
    getTZidentifier(chatId, async (tzIdent) => {
        if (tzIdent !== null) {
            await bot.sendMessage(chatId, messages.tellUserKnownLocation + tzIdent.tzIdentifier);
        } else {
            let replyMarkup = {reply_markup: JSON.stringify({
                keyboard : [[{text: messages.sendMyLoc, request_location: true}]]
            })};
            await bot.sendMessage(chatId, messages.errorNoLocationAsk, replyMarkup);
        }
    })
});

// thank you
bot.onText(/^(danke|thank you|thank(')?s)/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "You are very welcome!");
});

// I love you
bot.onText(/^(ich liebe dich|I love you)/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "I love you too!");
});

// cursing
bot.onText(/^(you|du|he(y)?)?( )?(ass(hole)?|arsch(loch)?|idiot|trott(e)?l|fuck you|cunt)/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "Well fuck you too 😃");
});

// how are you
bot.onText(/^(how are you|wie geht(')?s)/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "I'm ticking, how are you?");
});

// good
bot.onText(/good|bad|alright|gut|schlecht/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "I really don't care.");
});

// who am i
bot.onText(/^(who am i|wer bin ich)/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "You are " + msg.chat.first_name + ".");
});

// who are you
bot.onText(/^((who|what) are you|(wer|was) bist du)/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "I am Pill Reminder, a bot that tells you when to take your next pill.");
});

// time
bot.onText(/zeit|time$|wie spät ist es|wie viel uhr ist es|(what(')?s|what is) the time/i, async (msg) => {
    let chatId = msg.chat.id;
    await bot.sendMessage(chatId, "time");
});

saveOrUpdateUserToDb = (msg, callback) => {
    mongo.User.findOneAndUpdate(
        {_id: msg.chat.id},
        {
            "name.firstName": msg.chat.first_name,
            "name.lastName": msg.chat.last_name,
            "name.userName": msg.chat.username
        },
        {"upsert": true},
        (err, data) => {
            if (err) console.log(err + '\n' + data);
            callback();
        }
    )
};

getTZidentifier = (chatId, callback) => {
    mongo.User.findOne({'_id': chatId, 'tzIdentifier': {$ne: null}}, (err, result) => {
        if (err) {console.log(err)}
        callback(result);
    })
};

getUserTimes = (chatId, callback) => {
    mongo.User.findOne({'_id': chatId}, async (err, result) => {
        if (err) console.log(err);
        else {
            if (result.tzIdentifier === null) {
                await bot.sendMessage(chatId, messages.errorUserHasNoTimes);
            } else {
                let tzIdent = result.tzIdentifier;
                let userOffset = timezone.getOffset(tzIdent);
                mongo.Timeslot.find(
                    {'userIDs._id': chatId},
                    async (err, result) => {
                        if (err) {console.log(err)}
                        else {
                            let results = [];
                            result.forEach((resultObj) => {
                                let tIndex = resultObj._id;
                                let zuluTime = (Math.floor(tIndex/60)) + ":" + (tIndex % 60);
                                let userTime = moment(zuluTime, "HH:mm");
                                userTime.subtract(userOffset, 'minutes');
                                results.push(userTime.format('HH:mm'));
                            });
                            results.sort();
                            if (results.length > 0) {
                                callback(results);
                            } else {
                                await bot.sendMessage(chatId, messages.errorUserHasNoTimes);
                            }
                        }
                    }
                )
            }
        }
    })
};
