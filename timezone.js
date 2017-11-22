const request = require('request');
const momentTZ = require('moment-timezone');
const secret = require('./secret');

const timezone = {};
module.exports = timezone;

timezone.getOffset = (tzIdent) => {
    let now = new Date();
    return momentTZ.tz.zone(tzIdent).utcOffset(now);
};

timezone.googleGetTZidentifier = (location, callback) => {
    let options = {
        uri: 'https://maps.googleapis.com/maps/api/timezone/json',
        method: 'GET',
        qs: {
            'location': location.latitude + ',' + location.longitude,
            'timestamp': new Date() / 1000 | 0,
            'key': secret.googleApiKey
        }
    };

    request(options, (err, res, body) => {
        if (!err && res.statusCode === 200) {
            let parsedBody = JSON.parse(body);
            callback(parsedBody.timeZoneId)
        } else {
            console.log("error: " + err);
        }
    });
};
