'use strict';

const { experiment, test, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');

const nock = require('nock');
const { globalAgent } = require('http');
const debug = require('debug')('fetch-hooks');

const { hook, fetch, hooks } = require('../lib');

experiment('cookies', () => {
    beforeEach(async () => {
        nock.cleanAll();
        nock.disableNetConnect();
    });

    afterEach(async () => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    test('cookie passed to subsequent request', async () => {
        const nocks = nock('https://example.com').get('/set').reply(200, 'OK', { 'set-cookie': 'tested=true; Secure; HttpOnly; SameSite=Strict; Path=/' });
        nocks.get('/get').reply(function () {
            expect(this.req.headers).to.include({
                cookie: ['tested=true']
            });
            return [200, 'OK', { 'set-cookie': 'tested=; Secure; HttpOnly; SameSite=Strict; Path=/' }];
        });
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(2);

        const _fetch = hook(fetch, hooks.cookies());

        const req = await _fetch('https://example.com/set');
        const text = await req.text();
        expect(text).to.equal('OK');

        const req2 = await _fetch('https://example.com/get');
        const text2 = await req2.text();
        expect(text2).to.equal('OK');

        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(0);
    });
});
