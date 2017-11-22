const TelegramBot = require('node-telegram-bot-api');
const secret = require('./secret');

const bot = new TelegramBot(secret.telegramToken, { polling: true });
module.exports = bot;

// pm2
// install via npm
// sudo pm2 start index.js