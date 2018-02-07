'use strict';

const debug = require('debug')('fetch-hooks');
const joi = require('joi');
const schema = require('./schema');
const upstream = require('node-fetch');

/**
 * Manages hooks for changing the behaviour of WhatWG Fetch
 */
class FetchHookManager {
    /**
     * Creates an instance of `FetchHookManager`.
     *
     * @param {FetchHookManagerConfig} [config]
     */
     constructor(config) {
        this.fetch = this.fetch.bind(this);
        const { hooks, upstream } = joi.attempt(config, schema.fetchHookManagerConfig);
        this.hooks = hooks;
        /** @type {typeof fetch} */
        this.upstream = upstream;
        debug('manager constructed', this);
    }

    /**
     * API-compatible WhatWG `fetch`, as interfered with by its hooks.
     * `FetchHookManager` calls each hook in order and:
     *
     * - Ignores it if it returns a falsey value
     * - Returns any response it gives
     * - If not, continues with its replacement request
     * - Passes through to `config.upstream` if no hooks are left
     * - Rejects with an error if `config.upstream` is `null`
     *
     * @param {RequestInfo} input
     * @param {RequestInit} [init]
     * @returns {Promise<Response>}
     */
    async fetch(input, init) {
        let request = new upstream.Request(
            input,
            init
        );

        for (let hook of this.hooks) {
            let hr = joi.attempt(await hook(request), schema.fetchHookResponse);
            if (!hr) {
                continue;

            } else if (hr.response) {
                return hr.response;

            } else {
                request = hr.request;
            }
        }

        if (this.upstream) {
            return this.upstream(request);
        } else {
            throw new Error(`No hook permits access to: ${request.url}`);
        }
    }
}

FetchHookManager.upstream = upstream;

module.exports = FetchHookManager;
