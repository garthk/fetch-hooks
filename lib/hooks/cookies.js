const debug = require('../debug');
const { CookieJar } = require('tough-cookie');
const { parse, format } = require('url');

/**
 * Add a cookie jar using `tough-cookie`. Likely to clash with anything changing request URLs.
 */
module.exports = function makeCookieHook() {
    const jar = new CookieJar();
    return cookieHook;

    async function cookieHook(request) {
        const cookies = jar.getCookieStringSync(request.url);
        const where = elideQuery(request.url);
        if (cookies) {
            debug('sending cookies for', where);
            request.headers.set('cookie', cookies);
        } else {
            debug('no cookies for', where);
        }

        return {
            request,
            postreq(req, res, err) {
                if (!err) {
                    if (res.headers.has('set-cookie')) {
                        // not WhatWG-spec, but it's hard to avoid: https://github.com/bitinn/node-fetch/issues/251
                        const raw = res.headers.raw();
                        const all = raw['set-cookie'];
                        for (let newCookie of all) {
                            debug('got new cookies from', elideQuery(req.url));
                            jar.setCookieSync(newCookie, req.url);
                        }
                    }
                }
            }
        };
    };
}

/**
 * Elide the query from a URL.
 *
 * @param {string} url
 */
function elideQuery(url) {
    const { protocol, hostname, pathname } = parse(url);
    return format({ protocol, hostname, pathname });
}
