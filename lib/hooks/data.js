const fetch =  require('../fetch');
const debug = require('../debug');

const DEFAULT_CONTENT_TYPE = 'text/plain; charset=US-ASCII';

/**
 * Hook so `fetch` can handle `data:` URIs.
 *
 * @param {Request} request
 */
module.exports = async function dataHook(request) {
    debug('dataHook', request.method, request.url);

    const match = request.url.match(/^data:([^;,]+)?(;base64)?,(.+)$/);
    if (!match) {
        return null;
    }

    const [contentType, base64, data ] = match.slice(1);
    /** @type {Buffer} */
    let buf;

    if (base64) {
        buf = new Buffer(decodeURIComponent(data), 'base64');
    } else {
        buf = new Buffer(decodeURIComponent(data));
    }

    const headers = [
        [ 'content-type', fixContentType(contentType) ],
        [ 'content-length', buf.byteLength ]
    ];

    switch (request.method.toUpperCase()) {
        case 'HEAD':
            buf = new Buffer('');
            // fall through deliberately

        case 'GET':
            break;

        default:
            throw new Error('Can only GET or HEAD a data: URI');
    }

    const response = new fetch.Response(buf, {
        headers: [[ 'content-type', fixContentType(contentType)]]
    });
    return { response };
};

/**
 * Fix a `content-type` string found in a data: URI.
 * Works around a quirk in Node's `url.parse`, in which
 *
 * @param {string} contentType The original `content-type`
 */
function fixContentType(contentType) {
    if (!contentType || contentType === '/') {
        return DEFAULT_CONTENT_TYPE;
    } else {
        return contentType;
    }
}
