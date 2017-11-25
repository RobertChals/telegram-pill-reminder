# Telegram Pill Reminder 

This is a Telegram bot using Node.js for reminding its users to take a pill at a desired time.

Add the bot to your Telegram client:  
*@Pill\_Reminder\_Bot*

Since Telegram does not know a user's location by default, this bot needs to know the user's time zone in order to set the added times correctly. Therefore users are asked to send their location during onboarding.

## Usage

Make use of the */help* menu to list all commands.

### Add

Add a time in the following format:  
*HH:MM*

Examples:  
*18:30*  
*19:30*  
*05:30*

### Remove

Use */remove* to see a list of previously added times on the keyboard. Tap the desired time to remove it. 

### Times

Use */times* to see a list of previously added times.

### Location

Use */location* to see the currently stored user location.
