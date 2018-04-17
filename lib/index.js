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
        /** @type {FetchHookResponse['prereq'][]} */
        const prereqs = [];

        /** @type {FetchHookResponse['postreq'][]} */
        const postreqs = [];

        /** @type {FetchHookResponse['error'][]} */
        const errors = [];

        if (typeof input === 'string') {
            input = fixURI(input);
        }

        let request = new fetch.Request(
            input,
            init
        );

        for (let hook of hooks) {
            debug('checking hook');
            const beforeHook = Date.now();
            let hr = await hook(request);

            if (!hr) {
                continue;
            }

            gatherListener(hr.prereq, prereqs);
            gatherListener(hr.postreq, postreqs);
            gatherListener(hr.error, errors);

            if (hr.response) {
                const response = helpers.fixUpstreamBugs.wrapResponse(hr.response);
                callPrereqs(errors, prereqs, request, beforeHook);
                callPostreqs(errors, postreqs, request, response, null);
                return response;

            } else if (hr.request) {
                request = hr.request;
            }
        }

        callPrereqs(errors, prereqs, request, Date.now());
        try {
            let response = await makeUpstreamRequest(request);
            response = helpers.fixUpstreamBugs.wrapResponse(response);
            callPostreqs(errors, postreqs, request, response, null);
            return response;

        } catch (err) {
            callPostreqs(errors, postreqs, request, null, err);
            throw err;
        }
    }

    /**
     * Make the `upstream` request or die appropriately.
     * Extracted to its own function for stack trace clarity.
     */
    function makeUpstreamRequest(request) {
        if (upstream) {
            return upstream(request);
        } else {
            throw new Error(`No hook permits access to: ${request.url}`);
        }
    }
}

/**
 * Gather one of your request lifecycle event listeners.
 *
 * @template T The type of the listener
 * @param {T} fn The listener
 * @param {T[]} arr The array of listeners
 */
function gatherListener(fn, arr) {
    if (typeof fn === 'function') {
        arr.push(fn);
    }
}

/**
 * Call your pre-request hooks.
 *
 * @param {FetchErrorHandler[]} errors An array of error handlers
 * @param {FetchPreRequest[]} prereqs An array of pre-request handlers
 * @param {Request} request The request
 * @param {number} timestamp The timestamp (ms since epoch) of the request
 */
function callPrereqs(errors, prereqs, request, timestamp) {
    for (let prereq of prereqs) {
        try {
            prereq(request, timestamp);

        } catch (err) {
            callErrors(errors, err);
        }
    }
}

/**
 * Call your post-request hooks.
 *
 * @param {FetchErrorHandler[]} errors An array of error handlers
 * @param {FetchPostRequest[]} postreqs An array of post-request handlers
 * @param {Request} request The request
 * @param {Response} [response] The response, if the request didn't crash
 * @param {Error} [err] The error, if the request crashed
 */
function callPostreqs(errors, postreqs, request, response, err) {
    for (let postreq of postreqs) {
        try {
            postreq(request, response, err);
        } catch (err) {

            callErrors(errors, err);
        }
    }
}

/**
 * Call your error handlers.
 *
 * If there are none, re-throw to your `uncaughtException` handler.
 *
 * If any error handler crashes, throw the original error and the new error
 * to your `uncaughtException` handler, even if some previous error handler
 * didn't crash.
 *
 * @param {FetchErrorHandler[]} errors
 * @param {Error} err
 */
function callErrors(errors, err) {
    if (errors.length) {
        for (let error of errors) {
            try {
                error(err);

            } catch (err2) {
                setImmediate(() => { throw err });
                setImmediate(() => { throw err2 });
            }
        }

    } else {
        setImmediate(() => { throw err });
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
 * @property {Request} [request]
 * @property {Response} [response]
 * @property {FetchPreRequest} [prereq]
 * @property {FetchPostRequest} [postreq]
 * @property {FetchErrorHandler} [error]
 */

/**
 * A fetch lifecycle pre-request function.
 *
 * @typedef {(request: Request, timestamp: number) => void} FetchPreRequest
 */

 /**
 * A fetch lifecycle post-request function.
 *
 * @typedef {(request: Request, response: Response, err?: Error) => void} FetchPostRequest
 */

  /**
 * A fetch lifecycle error handling function.
 *
 * @typedef {(err: Error) => void} FetchErrorHandler
 */

/**
 * A fetch hook function.
 *
 * @typedef {{(request: Request): Promise<FetchHookResponse>}} FetchHook
 */
