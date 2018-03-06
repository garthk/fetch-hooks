const fetch =  require('../fetch');

const DEFAULT_CONTENT_TYPE = 'text/plain; charset=US-ASCII';

/**
 * Hook so `fetch` can handle `data:` URIs.
 *
 * @param {Request} request
 */
module.exports = async function dataHook(request) {
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
