
'use strict';

const { experiment, test, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const nock = require('nock');
const { globalAgent } = require('http');
const { hook, fetch, hooks } = require('../lib');
const { parse } = require('url');
const { Readable } = require('stream');

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

        test('response looks like a Response', async () => {
            const res = await _fetch(uri, {});
            expect(res.text, 'text').to.be.a.function();
            expect(res.body, 'body').to.be.instanceof(Readable);
            expect(res.headers, 'headers').to.be.an.object();
            expect(res.ok, 'ok').to.be.a.boolean();
            expect(res.headers.get, 'headers.get').to.be.a.function();
            expect(res.status, 'status').to.be.a.number();
            expect(res.statusText, 'statusText').to.be.a.string();
            expect(res.type, 'type').to.be.a.string();
            expect(res.url, 'url').to.be.a.string();
            expect(res.clone, 'clone').to.be.a.function();
        });

        test('response looks like a Body', async () => {
            const res = await _fetch(uri, {});
            expect(res.bodyUsed, 'bodyUsed').to.be.a.boolean();
            expect(res.blob, 'blob').to.be.a.function();
            expect(res.json, 'json').to.be.a.function();
            expect(res.text, 'text').to.be.a.function();
            expect(res.formData, 'formData').to.be.undefined();
        });

        test('url is more or less what we started with', async () => {
            const req = await _fetch(uri, {});
            expect(parse(req.url)).to.contain({
                pathname: '/,MIND%20BLOWN', // adjusted to survive node-fetch Request constructor
                protocol: 'data:'
            });
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
        nock('https://example.com').get('/').reply(200, 'hello');
        const req = await _fetch('https://example.com', {});
        expect(req.status).to.equal(200);
        const text = await req.text();
        expect(text).to.equal('hello');
    });
});
