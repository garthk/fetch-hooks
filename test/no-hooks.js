'use strict';

const { experiment, test, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');

const nock = require('nock');
const { globalAgent } = require('http');
const debug = require('debug')('fetch-hooks');

const { hook, fetch } = require('../lib');

experiment('no hooks', () => {
    test('happy path: await fetch, await text', async () => {
        const nocks = nock('https://example.com').get('/').reply(200, 'hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(1);

        const _fetch = hook(fetch);

        const init = { agent: globalAgent }; // test of the typings
        const req = await _fetch('https://example.com', init);
        const text = await req.text();

        expect(text).to.equal('hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(0);
    });
});
