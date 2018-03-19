
'use strict';

const { experiment, test, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const nock = require('nock');
const { globalAgent } = require('http');
const { hook, fetch, hooks } = require('../lib');
const { parse } = require('url');

const TEXT = 'MIND BLOWN';
const CONTENT_TYPE = 'text/ascii';

experiment('fetching data: URIs', () => {
    const _fetch = hook(fetch, hooks.data);

    experiment('without base64 or media type', () => {
        const uri = `data:,${encodeURIComponent(TEXT)}`;

        test('200', async () => {
            const req = await _fetch(uri, {});
            expect(req.status).to.equal(200);
        });

        test('text() decoded properly', async () => {
            const req = await _fetch(uri, {});
            const text = await req.text();
            expect(text).to.equal(TEXT);
        });

        test('got content-type: text/plain; charset=US-ASCII', async () => {
            const req = await _fetch(uri, {});
            expect(req.headers.get('content-type')).to.equal('text/plain; charset=US-ASCII');
        });

        test(`got content-length: ${TEXT.length}`, async () => {
            const req = await _fetch(uri, {});
            expect(req.headers.get('content-length')).to.equal(TEXT.length.toFixed(0));
        });
    });

    experiment('with content type and base64 encoding', () => {
        const buf = new Buffer(TEXT, 'utf8');
        const uri = `data:${CONTENT_TYPE};base64,${buf.toString('base64')}`;

        test('200', async () => {
            const req = await _fetch(uri, {});
            expect(req.status).to.equal(200);
        });

        test('text() decoded properly', async () => {
            const req = await _fetch(uri, {});
            const text = await req.text();
            expect(text).to.equal(TEXT);
        });

        test(`got content-type: ${CONTENT_TYPE}`, async () => {
            const req = await _fetch(uri, {});
            expect(req.headers.get('content-type')).to.equal(CONTENT_TYPE);
        });

        test(`got content-length: ${buf.byteLength}`, async () => {
            const req = await _fetch(uri, {});
            expect(req.headers.get('content-length')).to.equal(buf.byteLength.toFixed(0));
        });
    });

    test('http: URL still works', async () => {
        const nocks = nock('https://example.com').get('/').reply(200, 'hello');
        const req = await _fetch('https://example.com', {});
        expect(req.status).to.equal(200);
        const text = await req.text();
        expect(text).to.equal('hello');
    });
});
