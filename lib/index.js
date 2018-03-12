'use strict';

const debug = require('debug')('fetch-hooks');
const joi = require('joi');
const schema = require('./schema');
const fetch =  require('./fetch');
const hooks =  require('./hooks');
const helpers =  require('./helpers');
const { posix } = require('path');
const { parse, format } =  require('url');

/**
 * Return a new API-compatible WhatWG `fetch`, as interfered with by `hooks`.
 * When called, the returned function calls each hook in order and:
 *
 * - Ignores it if it returns a falsey value
 * - Returns any response it gives
 * - If not, continues with its replacement request
 * - Passes through to `upstream` if no hooks are left
 * - Rejects with an error if `upstream` is `null`
 *
 * @param {GlobalFetch['fetch']} upstream The upstream `fetch`, or `null`
 * @param {FetchHook[]} hooks Zero or more hook functions
 * @returns {GlobalFetch['fetch']} An API-compatible `fetch`
 */
function hook(upstream, ... hooks) {
    upstream = joi.attempt(upstream, schema.upstream);
    hooks = joi.attempt(hooks, schema.hooks);

    return hooked;

    /**
     * The hooked fetch function.
     *
     * @param {RequestInfo} input The `input`
     * @param {RequestInit} [init] The `init`
     * @returns {Promise<Response>} The response
     */
    async function hooked(input, init) {
        if (typeof input === 'string') {
            debug('hooked', input);
            input = fixURI(input);

        } else {
            debug('hooked');
        }

        let request = new fetch.Request(
            input,
            init
        );

        for (let hook of hooks) {
            debug('checking hook');
            let hr = await hook(request);

            if (!hr) {
                debug('hook passed');
                continue;

            } else if (hr.response) {
                debug('hook returned response');
                return hr.response;

            } else if (hr.request) {
                debug('hook returned new request');
                request = hr.request;

            } else {
                throw new Error('hook return value lacks both request and response');
            }
        }

        return makeUpstreamRequest(request);
    }

    /**
     * Make the `upstream` request or die appropriately.
     * Extracted to its own function for stack trace clarity.
     */
    function makeUpstreamRequest(request) {
        if (upstream) {
            debug('making upstream request', request.method, request.url);
            return upstream(request);
        } else {
            throw new Error(`No hook permits access to: ${request.url}`);
        }
    }
}

const FIXERS = [
    fixFileURI,
];

/**
 * Fix a URI as required to survive the `Request` constructor.
 *
 * @param {string} uri - The original URI
 */

function fixURI(uri) {
    for (let fixer of FIXERS) {
        const fixed = fixer(uri);
        if (fixed !== uri) {
            debug('hook', fixer.name, 'result', fixed);
        }
        uri = fixed;
    }

    return uri;
}

/**
 * Fix a `file:` URI so it survives the `Request` constructor.
 * Resolves it from the current directory if relative.
 * Lets the damage ensure if the host or port are present.
 *
 * @param {string} uri
 */
function fixFileURI(uri) {
    const parsed = parse(uri);
    if (parsed.protocol === 'file:'
     && !(parsed.host || parsed.port || posix.isAbsolute(parsed.pathname))) {
        const absolute = posix.resolve(process.cwd(), parsed.pathname);
        return format({
            ... parsed,
            // protocol: parsed.protocol,
            pathname: posix.resolve(process.cwd(), parsed.pathname),
        });
    } else {
        return uri;
    }
}

module.exports = {
    fetch,
    hook,
    hooks,
    helpers,
};

// --> typedefs for interfaces we're using above, hoisted for our convenience

/**
 * A fetch hook response.
 *
 * @typedef {object} FetchHookResponse
 * @property {Request} [request] - a modified `Request` for subsequent hooks
 * @property {Response} [response] - a **final** `Response`
 */

/**
 * A fetch hook function.
 *
 * @typedef {{(request: Request): Promise<FetchHookResponse>}} FetchHook
 */
