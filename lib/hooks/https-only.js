const debug = require('../debug');
const { parse } = require('url');

/**
 * Throw an error if the protocol isn't HTTPS.
 *
 * @param {Request} request
 */
module.exports = async function httpsOnly(request) {
    debug('httpsOnly', request.method, request.url);
    const { protocol } = parse(request.url);
    if (protocol.toUpperCase() !== 'HTTPS:') {
        throw new Error(`bad protocol: ${protocol}`);
    } else {
        return null;
    }
};
