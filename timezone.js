let request = require('request');
let momentTZ = require('moment-timezone');
let secret = require('./secret');

let timezone = {};
module.exports = timezone;

timezone.getOffset = function(tzIdent) {
    let now = new Date();
    return momentTZ.tz.zone(tzIdent).utcOffset(now);
};

timezone.googleGetTZidentifier = function (location, callback) {
    let options = {
        uri: 'https://maps.googleapis.com/maps/api/timezone/json',
        method: 'GET',
        qs: {
            'location': location.latitude + ',' + location.longitude,
            'timestamp': new Date() / 1000 | 0,
            'key': secret.googleApiKey
        }
    };

    request(options, function (err, res, body) {
        if (!err && res.statusCode === 200) {
            let parsedBody = JSON.parse(body);
            return callback(parsedBody.timeZoneId)
        } else {
            console.log("error: " + err);
        }
    });
};
