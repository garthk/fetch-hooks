
const fetch =  require('../fetch');
const debug = require('../debug');
const mime = require('mime');
const fs  = require('fs');
const { parse, format } = require('url');
const { bodyMatters } = require('../helpers');
const { promisify } = require('util');
const { posix } = require('path');

const stat = promisify(fs.stat);

const TOXIC = ['host', 'port', 'hash', 'query'];

/**
 * File hook options.
 *
 * @typedef {object} FileHookOptions
 * @property {string} [baseURI] - base URI or path; defaults to process.cwd() at request time
 */

/**
 * Handle `file:` URIs.
 *
 * @param {FileHookOptions} [options] The file hook's options
 */
module.exports = function makeFileHook(options) {
    options = options || {};
    debug('makeFileHook', options);
    return fileHook;

    /**
     * Hook so `fetch` can handle `file:` URIs.
     *
     * @param {Request} request
     */
    async function fileHook(request) {
        debug('fileHook', request.method, request.url);

        const parsed = parse(request.url);
        const baseURI = fixBaseURI(options.baseURI || process.cwd());

        if (parsed.protocol !== 'file:') {
            return null;
        }

        if (request.url === baseURI) {
            return { response: new fetch.Response('', { status: 403 }) };
        }

        if (!(request.url.startsWith(baseURI) && request.url.slice(baseURI.length, baseURI.length + 1) === '/')) {
            debug(`not under ${baseURI}`);
            return null;
        }

        for (let key of TOXIC) {
            if (parsed[key]) {
                throw new Error(`Can't handle file: URIs with ${key}: ${JSON.stringify(parsed[key])}`);
            }
        }

        let bytes = 0;
        let lastmod = 0;
        let body = null;

        const headers = [
            [ 'content-type', `${mime.getType(parsed.pathname)}; charset=UTF-8` ],
        ];

        try {
            debug('stat...');
            const stats = await stat(parsed.pathname);
            if (!stats.isFile()) {
                return {
                    response: new fetch.Response('', { status: 403 })
                };
            }

            bytes = stats.size;
            lastmod = stats.mtime.valueOf();
            headers.push([ 'content-length', bytes.toFixed(0) ]);

        } catch (err) {
            debug('stat err', err);
            if (err.code === 'ENOENT') {
                return {
                    response: new fetch.Response('', { status: 404 })
                };
            }
        }

        if (lastmod) {
            headers.push([ 'last-modified', new Date(lastmod).toUTCString() ]);
        }

        switch (request.method.toUpperCase()) {
            case 'HEAD':
                body = new Buffer('');
                break;

            case 'GET':
                body = fs.createReadStream(parsed.pathname);
                break;

            default:
                throw new Error('Can only GET or HEAD a file: URI');
        }

        const response = new fetch.Response(body, {
            headers,
        });
        return { response };
    }
};

/**
 * Fix `basePath` into an absolute `file:` URI.
 *
 * @param {string} basePath
 * @returns {string}
 */
function fixBaseURI(basePath) {
    debug('fixBasePath', basePath);
    let { protocol, pathname } = parse(basePath);
    if (protocol !== 'file:') {
        pathname = posix.resolve(process.cwd(), pathname);
        return format({
            protocol: 'file:',
            pathname,
        });

    } else {
        return basePath;
    }
}
