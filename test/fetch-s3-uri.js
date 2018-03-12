'use strict';

const { experiment, test, before, after } = exports.lab = require('lab').script();
const { expect } = require('code');
const nock = require('nock');
const { globalAgent } = require('http');
const { hook, fetch, hooks, helpers } = require('../lib');
const { format, parse } = require('url');

const BUCKET = '73077c8d-e53e-49f4-9060-c5217d296d5f';
const ENDPOINT = 's3.ap-southeast-2.amazonaws.com';

require('longjohn'); // required for stack testing

/**
 * A very, very small mock of an S3 Service object.
 *
 * @type {any}
 */
const s3 = {
    getSignedUrl: (operation, params, cb) => {
        cb(null, format({
            protocol: 'https:',
            hostname: `${params.Bucket}.${ENDPOINT}`,
            pathname: params.Key,
        }));
    },
};

experiment('fetching s3: URIs with the default base URI', () => {
    const _fetch = hook(fetch, hooks.s3(s3));

    experiment('GET s3://bucket/key', () => {
        const uri = `s3://${BUCKET}/index.html`;
        /** @type {Response} */
        let req;

        before(async () => {
            nock.disableNetConnect();
            const nocks = nock(`https://${BUCKET}.${ENDPOINT}:443`)
                .get('/index.html')
                .reply(200, 'Hello.\n', { 'Content-Type': 'text/html' });
            req = await _fetch(uri, {});
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('200', async () => {
            expect(req.status).to.equal(200);
        });

        test('got content-type: text/html', async () => {
            expect(req.headers.get('content-type')).to.equal('text/html');
        });

        test('text() decoded properly', async () => {
            const text = await req.text();
            expect(text).to.equal('Hello.\n');
        });
    });
});

experiment('fetching s3: URIs with a base URI constrained to a particular bucket', () => {
    const _fetch = hook(fetch, hooks.s3(s3, { baseURI: `s3://${BUCKET}` }));

    experiment('GET s3://bucket/key', () => {
        const uri = `s3://${BUCKET}/index.html`;
        /** @type {Response} */
        let req;

        before(async () => {
            nock.disableNetConnect();
            const nocks = nock(`https://${BUCKET}.${ENDPOINT}:443`)
                .get('/index.html')
                .reply(200, 'Hello.\n', { 'Content-Type': 'text/html' });
            req = await _fetch(uri, {});
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('200', async () => {
            expect(req.status).to.equal(200);
        });

        test('got content-type: text/html', async () => {
            expect(req.headers.get('content-type')).to.equal('text/html');
        });

        test('text() decoded properly', async () => {
            const text = await req.text();
            expect(text).to.equal('Hello.\n');
        });
    });

    experiment('GET s3://differentbucket/key', () => {
        const uri = `s3://differentbucket/index.html`;
        /** @type {Response} */
        let req;

        before(async () => {
            nock.disableNetConnect();
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('passed through to upstream', async () => {
            await expect(_fetch(uri, {})).rejects('Only HTTP(S) protocols are supported');
        });
    });

    experiment('GET s3://bucketwithlongername/key', () => {
        const uri = `s3://${BUCKET}2/index.html`;
        /** @type {Response} */
        let req;

        before(async () => {
            nock.disableNetConnect();
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('passed through to upstream', async () => {
            await expect(_fetch(uri, {})).rejects('Only HTTP(S) protocols are supported');
        });
    });

    experiment('HEAD s3://bucket/key', () => {
        const uri = `s3://${BUCKET}/index.html`;
        /** @type {Response} */
        let req;

        before(async () => {
            nock.disableNetConnect();
            const nocks = nock(`https://${BUCKET}.${ENDPOINT}:443`)
                .head('/index.html')
                .reply(200, new Buffer(''), { 'Content-Type': 'text/html' });
            req = await _fetch(uri, { method: 'HEAD' });
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('200', async () => {
            expect(req.status).to.equal(200);
        });

        test('got content-type: text/html', async () => {
            expect(req.headers.get('content-type')).to.equal('text/html');
        });

        test('text() decoded properly, but was empty', async () => {
            const text = await req.text();
            expect(text).to.equal('');
        });
    });

    experiment('PUT s3://bucket/key with a stream', () => {
        const uri = `s3://${BUCKET}/poster`;
        /** @type {Response} */
        let req;
        let acls = [];
        let readStacks = [];

        const body = helpers.readString(new Buffer('ツ', 'utf8'));
        const original = body.read;
        body.read = function read(... args) {
            readStacks.push(new Error('caught a read').stack);
            return original.bind(body)(... args);
        };

        before(async () => {
            nock.disableNetConnect();
            const nocks = nock(`https://${BUCKET}.${ENDPOINT}:443`)
                .put('/poster')
                .reply(function reply(uri, body, cb) {
                    (this.req.headers['x-amz-acl'] || []).forEach(v => acls.push(v));
                    cb(null, [200, '']);
                });
            req = await _fetch(uri, {
                body,
                method: 'PUT',
                headers: [
                    ['content-type', 'text/plain; charset=UTF-8'],
                    ['content-length', '3'],
                ]
            });
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('200', async () => {
            expect(req.status).to.equal(200);
        });

        test('read stack traces came from makeUpstreamRequest, not changeUrlOnly', async () => {
            expect(readStacks.length).to.be.min(4);
            const longStacks = readStacks.filter(stack => stack.split('\n').length > 6);
            for (let stack of longStacks) {
                expect(stack).to.contain('at makeUpstreamRequest ');
                expect(stack).to.not.contain('at changeUrlOnly ');
            }
        });
    });

    experiment('PUT s3://bucket/key without x-amz-acl', () => {
        const uri = `s3://${BUCKET}/poster`;
        /** @type {Response} */
        let req;
        let acls = [];
        const body = new Buffer('ツ', 'utf8');

        before(async () => {
            nock.disableNetConnect();
            const nocks = nock(`https://${BUCKET}.${ENDPOINT}:443`)
                .put('/poster')
                .reply(function reply(uri, body, cb) {
                    (this.req.headers['x-amz-acl'] || []).forEach(v => acls.push(v));
                    cb(null, [200, '']);
                });
            req = await _fetch(uri, {
                body,
                method: 'PUT',
                headers: [
                    ['content-type', 'text/plain; charset=UTF-8'],
                    ['content-length', body.byteLength.toFixed(0)],
                ]
            });
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('200', async () => {
            expect(req.status).to.equal(200);
        });

        test('x-amz-acl defaulted', async () => {
            expect(acls).to.equal([ 'private' ]);
        });
    });

    experiment('PUT s3://bucket/key with x-amz-acl', () => {
        const uri = `s3://${BUCKET}/poster`;
        /** @type {Response} */
        let req;
        let acls = [];
        const body = new Buffer('ツ', 'utf8');

        before(async () => {
            nock.disableNetConnect();
            const nocks = nock(`https://${BUCKET}.${ENDPOINT}:443`)
                .put('/poster')
                .reply(function reply(uri, body, cb) {
                    (this.req.headers['x-amz-acl'] || []).forEach(v => acls.push(v));
                    cb(null, [200, '']);
                });
            req = await _fetch(uri, {
                body,
                method: 'PUT',
                headers: [
                    ['content-type', 'text/plain; charset=UTF-8'],
                    ['content-length', body.byteLength.toFixed(0)],
                    ['x-amz-acl', 'public'],
                ]
            });
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('200', async () => {
            expect(req.status).to.equal(200);
        });

        test('x-amz-acl unchanged', async () => {
            expect(acls).to.equal([ 'public' ]);
        });
    });

    experiment('DELETE s3://bucket/key', () => {
        const uri = `s3://${BUCKET}/poster`;
        /** @type {Response} */
        let req;

        before(async () => {
            nock.disableNetConnect();
            const nocks = nock(`https://${BUCKET}.${ENDPOINT}:443`)
                .delete('/poster')
                .reply(204, new Buffer(''));
            req = await _fetch(uri, {
                method: 'DELETE',
            });
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('200', async () => {
            expect(req.status).to.equal(204);
        });
    });
});
