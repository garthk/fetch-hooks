
'use strict';

const { experiment, test, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const nock = require('nock');
const { hook, fetch, hooks } = require('../lib');

experiment('ensuring HTTPS only', () => {
    const _fetch = hook(fetch, hooks.httpsOnly);

    beforeEach(async () => {
        nock.disableNetConnect();
    });

    afterEach(async () => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    test('HTTPS URI passes through', async () => {
        nock('https://example.com').get('/').reply(200, 'hello');
        const req = await _fetch('https://example.com');
        expect(req.status).to.equal(200);
        expect(await req.text()).to.equal('hello');
    });

    test('HTTP URI is blocked', async () => {
        await expect(_fetch('http://example.com')).rejects('bad protocol: http:');
    });
});
