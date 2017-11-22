const messages = {};
module.exports = messages;

messages.pillMessages = ["💊💊💊", "🕖💊", "💊🕗", "🕘💊", "📢💊", "💊📣", "💊🆘"];

messages.generalMessage = "I am Pill Reminder, your assistant bot for telling you when to take your next pill.\n";
messages.onboardingSuccess = "Alright, now you can tell me what to do:\n";

// location
messages.sendMyLoc = "Send my location 📲";
messages.startLocation = `

Start by sending me your location, so I know which time zone you are in.
`;

messages.tellUserNewLocation = "I set your time zone location to ";
messages.tellUserKnownLocation = "You told me you are here: ";

// help
messages.helpMessage = `
/add - Tell me when I should remind you
/times - I'll show you the times you have already told me
/remove - Tell me when I should forget about a time
/location - I will tell you the location you have previously told me
`;
messages.helpAgainMessage = `
If you want to see this message again, just type /help`;

// times
messages.hintWillRemind =`I will remind you at the following times:

`;

messages.hintAddOrDeleteTimes = `

With /add you can tell me more times.
With /remove I can delete them for you.`;

messages.whatTimeToRemove = "What time do you want me to remove?";


// hint
messages.hintExamples = `Add a time in the following format: HH:mm

examples:
18:30
09:00
23:59`;

messages.successAdded = "Successfully added ";
messages.successRemoved = "Successfully removed ";
messages.hintTimeKnown = "I know that already!";

// error
messages.errorDeletingTimeEntry = "Sorry, I can't delete something that's not there.";
messages.errorUserHasNoTimes = "I don't have any reminder times saved for you. With /add you can tell me!";
messages.errorTimeNotRecognized = "I don't recognize that as a time.";
messages.errorLocationNeeded = "I still need your location to set your correct time zone.";
messages.errorInvalidLocation = "I don't know where that is... Wanna try again?";
messages.errorNoLocationAsk = "I don't have your location yet. Do you want to tell me?";
