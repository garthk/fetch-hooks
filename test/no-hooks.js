'use strict';

const { experiment, test, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');

const FetchHookManager = require('../lib');
const nock = require('nock');
const { globalAgent } = require('http');
const debug = require('debug')('fetch-hooks');

experiment('no hooks', () => {
    experiment('construction without arguments', () => {
        test('did not crash', async () => {
            expect(() => new FetchHookManager()).to.not.throw();
        });

        test('returned an object with a fetch method', async () => {
            expect(new FetchHookManager().fetch).to.be.a.function();
        });
    });

    test('happy path: await fetch, await text', async () => {
        const nocks = nock('https://example.com').get('/').reply(200, 'hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(1);

        const { fetch } = new FetchHookManager();

        const init = { agent: globalAgent }; // test of the typings
        const req = await fetch('https://example.com', init);
        const text = await req.text();

        expect(text).to.equal('hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(0);
    });
});
