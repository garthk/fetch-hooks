const fetch =  require('../fetch');
const bodyMatters = require('./body-matters');
const assert =  require('assert');
const stream =  require('stream');
const readString = require('./read-string');

const RESPONSE_TRAPS = {
    get(obj, prop) {
        const value = obj[prop];

        if (prop === 'type' && typeof value !== 'string') {
            return 'default';

        } else if (prop === 'body' && !(value instanceof stream.Readable)) {
            if (typeof value === 'string') {
                return readString(value);

            } else if (Buffer.isBuffer(value)) {
                return readString(value);

            } else {
                return value; // sorry; I trust this is the least bad result
            }

        } else if (typeof value === 'function') {
            // ensure the Response's members get direct access to their own properties
            return value.bind(obj);

        } else {
            return value;
        }
    }
}

/**
 * Adds the missing `response.type` required by the spec, and ensure
 * `response.body` is a readable stream as advertised.
 *
 * @param {Response} response
 */
module.exports.wrapResponse = function wrapResponse(response) {
    return new Proxy(response, RESPONSE_TRAPS);
};
