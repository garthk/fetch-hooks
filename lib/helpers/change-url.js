const fetch =  require('../fetch');
const bodyMatters = require('./body-matters');

/**
 * Return a new `Request` based on `request`, but with a different `url`.
 *
 * @param {Request} request
 * @param {string} url
 * @returns {Promise<Request>}
 */
module.exports = async function changeUrlOnly(request, url) {
    const init = {
        // https://fetch.spec.whatwg.org/#request-class
        // signal: in spec, not in lib.es2017.full.d.ts or node-fetch
        // window: in spec and lib.es2017.full.d.ts, not in node-fetch
        // body: dealt with below
        cache: request.cache,
        compress: request.compress, // node-fetch extra
        credentials: request.credentials, // not supported by node-fetch
        follow: request.follow,// node-fetch extra
        headers: request.headers,
        integrity: request.integrity,
        keepalive: request.keepalive,
        method: request.method,
        mode: request.mode,
        redirect: request.redirect,
        referrer: request.referrer, // not supported by node-fetch
        referrerPolicy: request.referrerPolicy, // not supported by node-fetch
        size: request.size, // node-fetch extra
        timeout: request.timeout, // node-fetch extra
    };

    if (bodyMatters(request)) {
        /** @type {any} for the typings */
        const _request = request;
        init.body = _request.body; // avoids reading streams
    }

    return new fetch.Request(url, init);
}
