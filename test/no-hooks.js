'use strict';

const { experiment, test } = exports.lab = require('lab').script();
const { expect } = require('code');

const FetchHookManager = require('../lib');
const nock = require('nock');
const { globalAgent } = require('http');

experiment('with no hooks and default upstream', () => {
    test('await fetch, await text works', async () => {
        const { fetch } = new FetchHookManager();
        const nocks = nock('https://example.com').get('/').reply(200, 'hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(1);

        const init = { agent: globalAgent }; // test of the typings
        const req = await fetch('https://example.com', init);
        const text = await req.text();

        expect(text).to.equal('hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(0);
    });
});
