'use strict';

const { experiment, test, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');

const FetchHookManager = require('../lib');
const nock = require('nock');
const { globalAgent } = require('http');

experiment('simple hook return cases', () => {
    let nocks;

    beforeEach(async () => {
        nock.disableNetConnect();
        nocks = nock('https://example.com').get('/').reply(200, 'hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(1);
    });

    afterEach(async () => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    test('return null → upstream fetch', async () => {
        let calls = 0;

        async function noop(request) {
            calls++;
            return null;
        }

        const fetch = new FetchHookManager({
            hooks: [noop]
        }).fetch;

        const init = { agent: globalAgent }; // test of the typings
        const req = await fetch('https://example.com', init);
        const text = await req.text();

        expect(text).to.equal('hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(0);
        expect(calls).to.equal(1);
    });

    test('return { response } → no upstream fetch', async () => {
        let calls = 0;

        async function substituteResponse(request) {
            calls++;
            var s = 'goodbye';
            const response = new FetchHookManager.upstream.Response(s, {
                headers: {
                    'content-type': 'application/test'
                }
            });
            return { response };
        }

        const fetch = new FetchHookManager({
            hooks: [substituteResponse]
        }).fetch;

        const init = { agent: globalAgent }; // test of the typings
        const req = await fetch('https://example.com', init);
        const text = await req.text();

        expect(text).to.equal('goodbye');
        expect(req.headers.get('content-type')).to.equal('application/test');
        expect(calls).to.equal(1);
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(1);
    });

    test('return { request } → different fetch', async () => {
        let calls = 0;

        async function substituteRequest(request) {
            calls++;
            const replacement = new FetchHookManager.upstream.Request(
                'https://example.com'
            );
            return { request: replacement };
        }

        const fetch = new FetchHookManager({
            hooks: [substituteRequest]
        }).fetch;

        const init = { agent: globalAgent }; // test of the typings
        const req = await fetch('https://example.com/nope', init);
        const text = await req.text();

        expect(text).to.equal('hello');
        expect(nocks.pendingMocks()).to.be.an.array().and.have.length(0);
        expect(calls).to.equal(1);
    });
});
