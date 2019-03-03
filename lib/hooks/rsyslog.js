const fetch =  require('../fetch');
const { RemoteSyslog, FACILITY, SEVERITY, NILVALUE } = require('rsyslog');
const { format, parse } =  require('url');
const { changeUrlOnly, bodyMatters } = require('../helpers');
const debug = require('../debug');
const joi = require('joi');
const os = require('os');

/**
 * Make a hook to report fetch activity via syslog over UDP.
 */
module.exports = function makeRemoteSyslogHook(options) {
    debug('makeRemoteSyslogHook', options);
    options = { ... options };
    const elide = options.elide || removeAuthAndQuery;
    delete options.elide;

    const rsyslog = new RemoteSyslog(options);
    const map = new Map();
    return rsysloghook;

    /**
     * Report fetch activity via syslog over UDP.
     *
     * @param {Request} request
     */
    async function rsysloghook(request) {
        debug('rsysloghook', request.method, request.url);
        return {
            prereq,
            postreq,
        };
    }

    /**
     * Gather the timestamp from the request.
     *
     * @param {Request} request
     * @param {number} timestamp
     */
    function prereq(request, timestamp) {
        map.set(request, timestamp);
    }

    /**
     * Send information about a request, response, and upstream request error.
     *
     * @param {Request} request
     * @param {Response} response
     * @param {Error} err
     */
    function postreq(request, response, err) {
        const timestamp = map.get(request);
        const msg = [
            err ? NILVALUE : response.status.toFixed(0),
            request.method.toUpperCase(),
            elide(request.url),
        ];

        if (timestamp) {
            msg.push(`ms=${(Date.now() - timestamp).toFixed(0)}`);
        }

        const length = getContentLength(request, response);
        if (typeof length === 'number' && !isNaN(length)) {
            msg.push(`len=${length.toFixed(0)}`);
        }

        const severity = getSeverity(response, err);
        rsyslog.send(severity, msg.join(' '), { timestamp, msgid: 'fetch' });
    }
}

/**
 * Decide the severity to assign to a response or error.
 *
 * @param {Response} response
 * @param {Error} err
 * @returns {number}
 */
function getSeverity(response, err) {
    if (err) {
        return SEVERITY.ERROR;

    } else if (response.status < 400) {
        return SEVERITY.INFO;

    } else {
        return SEVERITY.WARNING;
    }
}

/**
 * Determine the transferred content length.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {number}
 */
function getContentLength(request, response) {
    if (!(response && response.headers)) {
        return NaN;
    }

    const contentLength = parseInt(response.headers.get('content-length'), 10);

    if (!isNaN(contentLength)) {
        return contentLength; // requires trusting upstream, but copes with gzip etc

    } else if (Buffer.isBuffer(response.body)) {
        // assumes no content-encoding, which is fine because it'll only
        // happen when a hook constructrs its own Response from a buffer:
        return response.body.byteLength;

    } else if (typeof response.body === 'string') {
        // assumes no content-encoding, which is fine because it'll only
        // happen when a hook constructrs its own Response from a buffer
        // also assumes utf-8 charset, which is slightly less fine:
        return Buffer.byteLength(response.body, 'utf8');

    } else if (request.method === 'HEAD') {
        // not necessarily true:
        return 0;

    } else {
        // stream with no content length: no idea
        return NaN;
    }
}

/**
 * Elide a URL for syslog transmission, removing the `auth` and `query`
 * in particular for the safety.
 */
function removeAuthAndQuery(url) {
    const { protocol, host, pathname } = parse(url);
    if (protocol === 'data:') {
        return 'data:...';

    } else {
        return format({
            protocol,
            host,
            pathname,
        });
    }
}
