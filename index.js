let mongo = require('./mongo');
let bot = require('./bot');
let moment = require('moment');
let schedule = require('./schedule');
let timezone = require('./timezone');
let messages = require('./messages');

// add time
bot.myBot.onText(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/i, function (msg) {
    let chatId = msg.chat.id;
    getTZidentifier(chatId, function (result) {
        if (result === null) {
            let replyMarkup = {reply_markup: JSON.stringify({
                keyboard : [[{text: messages.sendMyLoc, request_location: true}]]
            })};
            bot.myBot.sendMessage(chatId, messages.errorLocationNeeded +
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
                    function (err, numAffected) {
                        if (err) {console.log(err)}
                        else {
                            if (numAffected.n !== 0)
                                bot.myBot.sendMessage(chatId, messages.successAdded + timeEntered);
                            else {
                                bot.myBot.sendMessage(chatId, messages.hintTimeKnown)
                            }
                        }
                    }
                )
            } else {
                bot.myBot.sendMessage(chatId, messages.errorTimeNotRecognized);
            }
        }
    })
});

//times
bot.myBot.onText(/^\/times$/i, function (msg) {
    let chatId = msg.chat.id;
    getUserTimes(chatId, function (results) {
        if (results !== null) {
            bot.myBot.sendMessage(chatId,
                messages.hintWillRemind +
                results.join('\n') +
                messages.hintAddOrDeleteTimes
            );
        }
    })
});

// start
bot.myBot.onText(/^\/start$/i, function (msg) {
    saveOrUpdateUserToDb(msg, function () {
        let chatId = msg.chat.id;
        let firstName = msg.from.first_name;
        let welcomeMessage = "Welcome " + firstName + "!" + messages.startLocation;
        let replyMarkup = {reply_markup: JSON.stringify({
            keyboard : [[{text: messages.sendMyLoc, request_location: true}]]
        })};
        bot.myBot.sendMessage(chatId, welcomeMessage, replyMarkup);
    })
});

// help
bot.myBot.onText(/\/help/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, messages.generalMessage + messages.helpMessage);
});

// settings
bot.myBot.onText(/\/settings/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, messages.helpMessage);
});

// ping
bot.myBot.onText(/^(\/)?ping$/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "pong");
});

// hallo
bot.myBot.onText(/^hi|h([ae])llo|hey|hola|seas|servus */i, function (msg) {
    let chatId = msg.chat.id;
    let firstName = msg.from.first_name;
    bot.myBot.sendMessage(chatId, "Hello " + firstName + "!");
});

// add
bot.myBot.onText(/^\/add$/i, function (msg) {
    let chatId = msg.chat.id;
    getTZidentifier(chatId, function (result) {
        if (result === null) {
            let replyMarkup = {reply_markup: JSON.stringify({
                keyboard : [[{text: messages.sendMyLoc, request_location: true}]]
            })};
            bot.myBot.sendMessage(chatId, messages.errorLocationNeeded, replyMarkup);
        } else {
            bot.myBot.sendMessage(chatId, messages.hintExamples);
        }
    })
});

// remove
bot.myBot.onText(/^\/remove$/i, function (msg) {
    let chatId = msg.chat.id;
    getUserTimes(chatId, function (results) {
        if (results !== null) {
            results.forEach(function (string, index) {
                results[index] = "✘ " + string;
            });
            let replyMarkup = {reply_markup: JSON.stringify({
                keyboard : [results]
            })};

            bot.myBot.sendMessage(chatId, messages.whatTimeToRemove, replyMarkup);
        }
    })
});

// remove timeslot
bot.myBot.onText(/^✘ ([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/i, function (msg) {
    let chatId = msg.chat.id;
    let replyRemove = {reply_markup: JSON.stringify({
        remove_keyboard : true,
        selective: true
    })};
    let strArr = msg.text.split(" ");
    let timeEntered = strArr[1];
    let time = moment(timeEntered, "HH:mm");
    if (time.isValid()) {
        mongo.User.findOne({'_id': chatId}, function (err, result) {
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
                        function (err, result) {
                            if (result !== null) {
                                mongo.Timeslot.updateOne(
                                    {_id: timeIndex},
                                    {$pull: {userIDs: {_id: chatId}}},
                                    function (err, numAffected) {
                                        // for some reason numAffected returns 1 even if no element is affected
                                        if (err) console.log(err);
                                        else {
                                            bot.myBot.sendMessage(chatId, messages.successRemoved + timeEntered,
                                                replyRemove);
                                        }
                                    });
                            } else {
                                bot.myBot.sendMessage(chatId, messages.errorDeletingTimeEntry, replyRemove)
                            }
                        }
                    )
                }
            }
        })
    }
});

bot.myBot.on('location', (msg) => {
    let chatId = msg.chat.id;
    let replyRemove = {reply_markup: JSON.stringify({
        remove_keyboard : true,
        selective: true
    })};

    bot.myBot.sendChatAction(chatId, "find_location");

    let loc = {
        longitude: msg.location.longitude,
        latitude: msg.location.latitude
    };

    // first time user in onboard process
    let firstTimeUser = false;
    getTZidentifier(chatId, function (result) {
        if (result === null) {firstTimeUser = true}
    });

    // Google Time Zone API Call
    timezone.googleGetTZidentifier(loc, function(tzIdent) {
        if (tzIdent !== undefined) {
            mongo.User.findByIdAndUpdate(
                chatId,
                {$set: {location: loc, tzIdentifier: tzIdent}},
                {new: true},
                function(err, model) {
                    if (err) console.log(err);
                }
            );

            bot.myBot.sendMessage(chatId, messages.tellUserNewLocation + tzIdent, replyRemove);
            if (firstTimeUser) {
                bot.myBot.sendMessage(chatId, messages.onboardingSuccess +
                    messages.helpMessage + messages.helpAgainMessage, replyRemove);
            }

        } else {
            bot.myBot.sendMessage(chatId, messages.errorInvalidLocation);
        }

        // TODO: shift all user's times to new offset if user updates his location

    });
});

// string location
bot.myBot.onText(/^\/location$/i, function (msg) {
    let chatId = msg.chat.id;
    getTZidentifier(chatId, function (tzIdent) {
        if (tzIdent !== null) {
            bot.myBot.sendMessage(chatId, messages.tellUserKnownLocation + tzIdent.tzIdentifier);
        } else {
            let replyMarkup = {reply_markup: JSON.stringify({
                keyboard : [[{text: messages.sendMyLoc, request_location: true}]]
            })};
            bot.myBot.sendMessage(chatId, "I don't have your location yet. Do you want to tell me?", replyMarkup);
        }
    })
});

// thank you
bot.myBot.onText(/^(danke|thank you|thank(')?s)/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "You are very welcome!");
});

// I love you
bot.myBot.onText(/^(ich liebe dich|I love you)/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "I love you too!");
});

// cursing
bot.myBot.onText(/^(you|du|he(y)?)?( )?(ass(hole)?|arsch(loch)?|idiot|trott(e)?l|fuck you|cunt)/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "Well fuck you too 😃");
});

// how are you
bot.myBot.onText(/^(how are you|wie geht(')?s)/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "I'm ticking, how are you?");
});

// good
bot.myBot.onText(/good|bad|alright|gut|schlecht/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "I really don't care.");
});

// who am i
bot.myBot.onText(/^(who am i|wer bin ich)/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "You are " + msg.chat.first_name + ".");
});

// who are you
bot.myBot.onText(/^((who|what) are you|(wer|was) bist du)/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "I am Pill Reminder, a bot that tells you when to take your next pill.");
});

// time
bot.myBot.onText(/zeit|time$|wie spät ist es|wie viel uhr ist es|(what(')?s|what is) the time/i, function (msg) {
    let chatId = msg.chat.id;
    bot.myBot.sendMessage(chatId, "time");
});

saveOrUpdateUserToDb = function (msg, callback) {
    mongo.User.findOneAndUpdate(
        {_id: msg.chat.id},
        {
            "name.firstName": msg.chat.first_name,
            "name.lastName": msg.chat.last_name,
            "name.userName": msg.chat.username
        },
        {"upsert": true},
        function (err, data) {
            if (err) console.log(err);
            return callback();
        }
    )
};

getTZidentifier = function (chatId, callback) {
    mongo.User.findOne({'_id': chatId, 'tzIdentifier': {$ne: null}}, function (err, result) {
        if (err) {console.log(err)}
        return callback(result);
    })
};

getUserTimes = function(chatId, callback) {
    mongo.User.findOne({'_id': chatId}, function (err, result) {
        if (err) console.log(err);
        else {
            if (result.tzIdentifier === null) {
                bot.myBot.sendMessage(chatId, messages.errorUserHasNoTimes);
            } else {
                let tzIdent = result.tzIdentifier;
                let userOffset = timezone.getOffset(tzIdent);
                mongo.Timeslot.find(
                    {'userIDs._id': chatId},
                    function (err, result) {
                        if (err) {console.log(err)}
                        else {
                            let results = [];
                            result.forEach(function (resultObj) {
                                let tIndex = resultObj._id;
                                let zuluTime = (Math.floor(tIndex/60)) + ":" + (tIndex % 60);
                                let userTime = moment(zuluTime, "HH:mm");
                                userTime.subtract(userOffset, 'minutes');
                                results.push(userTime.format('HH:mm'));
                            });
                            results.sort();
                            if (results.length > 0) {
                                return callback(results);
                            } else {
                                bot.myBot.sendMessage(chatId, messages.errorUserHasNoTimes);
                            }
                        }
                    }
                )
            }
        }
    })
};
