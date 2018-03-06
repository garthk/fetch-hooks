'use strict';

const debug = require('debug')('fetch-hooks');
const joi = require('joi');
const schema = require('./schema');
const fetch =  require('./fetch');
const hooks =  require('./hooks');

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
        let request = new fetch.Request(
            input,
            init
        );

        for (let hook of hooks) {
            let hr = await hook(request);

            if (!hr) {
                continue;

            } else if (hr.response) {
                return hr.response;

            } else if (hr.request) {
                request = hr.request;

            } else {
                throw new Error('hook return value lacks both request and response');
            }
        }

        if (upstream) {
            return upstream(request);
        } else {
            throw new Error(`No hook permits access to: ${request.url}`);
        }
    }
}

module.exports = {
    fetch,
    hook,
    hooks,
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
