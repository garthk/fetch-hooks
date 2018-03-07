'use strict';

const stream = require('stream')

/**
 * Reads a string or a buffer as a readable stream.
 *
 * @param {string | Buffer} str The string to read
 * @returns {NodeJS.ReadableStream}
 */
module.exports = function readString(str) {
    var s = new stream.Readable();
    s.push(str);
    s.push(null);
    return s;
};
