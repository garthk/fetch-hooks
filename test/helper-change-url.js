'use strict';

const { experiment, test, before, after } = exports.lab = require('lab').script();
const { expect } = require('code');
const nock = require('nock');
const { globalAgent } = require('http');
const { hook, fetch, hooks, helpers } = require('../lib');
const { parse } = require('url');

experiment('changing request URLs with changeUrlOnly', () => {
    before(async () => {
        nock.disableNetConnect();
        nock('https://example.com').get('/').reply(200, 'hello');
    });

    after(async () => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    test('GET', async () => {
        let calls = 0;

        async function substituteRequest(request) {
            calls++;
            request = await helpers.changeUrlOnly(request, 'https://example.com');
            return { request };
        }

        const _fetch = hook(fetch, substituteRequest);

        const req = await _fetch('https://example.com/nope');
        const text = await req.text();

        expect(text).to.equal('hello');
        expect(calls).to.equal(1);
    });
});
