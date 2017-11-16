let TelegramBot = require('node-telegram-bot-api');
let secret = require('./secret');

let bot = {};
module.exports = bot;

// pm2
// install via npm
// startup script:
// sudo env PATH=$PATH:/usr/local/bin pm2 startup systemd -u pi --hp /home/pi
// sudo pm2 start index.js

bot.myBot = new TelegramBot(secret.telegramToken, { polling: true });
