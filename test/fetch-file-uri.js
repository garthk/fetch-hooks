'use strict';

const { experiment, test, beforeEach, afterEach } = exports.lab = require('lab').script();
const { expect } = require('code');
const nock = require('nock');
const { globalAgent } = require('http');
const { hook, fetch, hooks } = require('../lib');
const { format, parse } = require('url');
const { join, posix, sep } = require('path');
const { readFileSync } = require('fs');
const { Readable } = require('stream');

const TEXT = 'MIND BLOWN';
const CONTENT_TYPE = 'text/ascii';

experiment('fetching file: URIs with baseURI set to test data directory', () => {
    const _fetch = hook(null, hooks.file({ baseURI: join(__dirname, 'data') }));

    experiment('GET absolute path, no headers', () => {
        const uri = format({
            protocol: 'file:',
            pathname: posix.resolve(__dirname, 'data', 'smiley.txt'),
        });

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

        test('text() decoded as if UTF-8 charset / utf8 encoding', async () => {
            const req = await _fetch(uri, {});
            const text = await req.text();
            expect(text).to.equal(readFileSync(join(__dirname, 'data', 'smiley.txt'), 'utf8'));
        });

        test('got content-type: text/plain; charset=UTF-8', async () => {
            const req = await _fetch(uri, {});
            expect(req.headers.get('content-type')).to.equal('text/plain; charset=UTF-8');
        });

        test('got content-length: 5', async () => {
            const req = await _fetch(uri, {});
            expect(req.headers.get('content-length')).to.equal('5');
        });
    });

    experiment('GET relative path', () => {
        test('200 OK with correct text', async () => {
            process.chdir(posix.resolve(__dirname, 'data'));
            const req = await _fetch('file:smiley.txt', {});
            expect(req.status).to.equal(200);
            const text = await req.text();
            expect(text).to.equal(readFileSync(join(__dirname, 'data', 'smiley.txt'), 'utf8'));
        });
    });

    experiment('GET file that doesn\'t exist', () => {
        const uri = format({
            protocol: 'file:',
            pathname: posix.join(__dirname, 'data', '8FPOY38LCGS41S8GUIX0TY0LP9RNX217'),
        });

        test('404 Not Found', async () => {
            const req = await _fetch(uri, {});
            expect(req.status).to.equal(404);
            expect(req.statusText).to.equal('Not Found');
        });
    });

    experiment('GET file not under default base path, even if it exists', () => {
        const uri = format({
            protocol: 'file:',
            pathname: posix.join(__dirname, '..', posix.basename(__dirname), posix.basename(__filename)),
        });

        test('pass through to upstream', async () => {
            await expect(_fetch(uri, {})).rejects(`No hook permits access to: ${uri}`);
        });
    });

    experiment('GET directory by accident', () => {
        const uri = format({
            protocol: 'file:',
            pathname: join(__dirname, 'data', 'subdir'),
        });

        test('403 Forbidden', async () => {
            const req = await _fetch(uri, {});
            expect(req.status).to.equal(403);
            expect(req.statusText).to.equal('Forbidden');
        });
    });

    experiment('GET basePath by accident', () => {
        const uri = format({
            protocol: 'file:',
            pathname: join(__dirname, 'data'),
        });

        test('403 Forbidden', async () => {
            const req = await _fetch(uri, {});
            expect(req.status).to.equal(403);
            expect(req.statusText).to.equal('Forbidden');
        });
    });

    experiment('HEAD absolute path, no headers', () => {
        const uri = format({
            protocol: 'file:',
            pathname: posix.resolve(__dirname, 'data', 'smiley.txt'),
        });

        test('200', async () => {
            const req = await _fetch(uri, { method: 'HEAD' });
            expect(req.status).to.equal(200);
        });

        test('text() is empty', async () => {
            const req = await _fetch(uri, { method: 'HEAD' });
            const text = await req.text();
            expect(text).to.equal('');
        });

        test('got content-type: text/plain', async () => {
            const req = await _fetch(uri, { method: 'HEAD' });
            expect(req.headers.get('content-type')).to.equal('text/plain; charset=UTF-8');
        });

        test('got content-length: 5', async () => {
            const req = await _fetch(uri, { method: 'HEAD' });
            expect(req.headers.get('content-length')).to.equal('5');
        });
    });

    test('http: URL still works', async () => {
        const _fetch = hook(fetch, hooks.file({ baseURI: join(__dirname, 'data') }));
        nock('https://example.com').get('/').reply(200, 'hello');
        const req = await _fetch('https://example.com', {});
        expect(req.status).to.equal(200);
        const text = await req.text();
        expect(text).to.equal('hello');
    });
});
