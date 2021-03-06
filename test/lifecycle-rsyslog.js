
'use strict';

const { experiment, test, before, after } = exports.lab = require('lab').script();
const { expect } = require('code');
const { hook, hooks, fetch } = require('../lib');
const { createSocket } = require('dgram');
const { hostname } = require('os');
const { NILVALUE } = require('rsyslog');

const nock = require('nock');

experiment('lifecycle event listener: rsyslog', () => {
    let socket;
    let messages = [];
    let address;
    let port;

    before(() => new Promise(resolve => {
        socket = createSocket('udp4');
        socket.on('listening', () => {
            const addr = socket.address();
            address = addr.address;
            port = addr.port;
        });

        socket.on('message', message => {
            messages.push(message);
        });

        socket.unref();
        socket.bind(0, '127.0.0.1', resolve);
    }));

    after(() => new Promise(resolve => {
        socket.close(resolve);
    }));

    experiment('happy path: well behaved listeners on successful request', () => {
        let req;
        let nowish;
        let parts = splitParts([]);

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            nock('https://example.com').get('/').reply(200, 'hello');
            const _fetch = hook(fetch, hooks.rsyslog({
                target_host: address,
                target_port: port,
                appname: 'appname'
            }));
            nowish = Date.now();
            messages.splice(0); // clears them
            req = await _fetch('https://example.com');
            await waitLongEnoughForDispatch();
            parts = splitParts(messages);
        });

        test('request succeeded', async () => {
            expect(req.status).to.equal(200);
        })

        test('packet arrived', async () => {
            expect(messages.length).to.equal(1);
        });

        test('syslog priority OK', async () => {
            expect(parts.header[0]).to.equal('<134>1');
        });

        test('syslog timestamp OK', async () => {
            expect(new Date(parts.header[1]).valueOf()).to.be.a.number().min(nowish).max(nowish + 100);
        });

        test('syslog hostname OK', async () => {
            expect(parts.header[2]).to.equal(hostname());
        });

        test('syslog appname OK', async () => {
            expect(parts.header[3]).to.equal('appname');
        });

        test('syslog pid OK', async () => {
            expect(parts.header[4]).to.equal(process.pid.toFixed(0));
        });

        test('syslog msgid === "fetch"', async () => {
            expect(parts.header[5]).to.equal('fetch');
        });

        test('syslog structured-data is empty', async () => {
            expect(parts.header[6]).to.equal(NILVALUE);
        });

        test('syslog message has 4 parts', async () => {
            expect(parts.message).to.have.length(4);
        });

        test('syslog message has status code: 200', async () => {
            expect(parts.message[0]).to.equal('200');
        });

        test('syslog message has method in uppercase: GET', async () => {
            expect(parts.message[1]).to.equal('GET');
        });

        test('syslog message has request url', async () => {
            expect(parts.message[2]).to.equal('https://example.com/');
        });

        test('syslog message has request duration in ms', async () => {
            expect(parts.message[3].slice(0, 3)).to.equal('ms=');
            expect(parseInt(parts.message[3].slice(3))).to.be.a.number().min(0).max(10);
        });
    });

    experiment('unhappy path: failed request', () => {
        let parts = splitParts([]);

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            const badFetch = () => {
                throw new Error('bad');
            };
            const _fetch = hook(badFetch, hooks.rsyslog({
                target_host: address,
                target_port: port,
                appname: 'appname'
            }));
            messages.splice(0); // clears them
            nock('https://example.com').get('/').reply(200, 'hello');
            await expect(_fetch('https://example.com')).rejects('bad');
            await waitLongEnoughForDispatch();
            parts = splitParts(messages);
        });

        test('packet arrived', async () => {
            expect(messages.length).to.equal(1);
        });

        test('syslog message has status code: -', async () => {
            expect(parts.message[0]).to.equal('-');
        });

        test('syslog message has method in uppercase: GET', async () => {
            expect(parts.message[1]).to.equal('GET');
        });

        test('syslog message has request url', async () => {
            expect(parts.message[2]).to.equal('https://example.com/');
        });

        test('syslog message has request duration in ms', async () => {
            expect(parts.message[3].slice(0, 3)).to.equal('ms=');
            expect(parseInt(parts.message[3].slice(3))).to.be.a.number().min(0).max(10);
        });
    });

    experiment('secret elision', () => {
        let req;
        let nowish;
        let parts = splitParts([]);

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            nock('https://example.com').get('/?secret=xyzzy').reply(200, 'hello');
            const _fetch = hook(fetch, hooks.rsyslog({
                target_host: address,
                target_port: port,
                appname: 'appname'
            }));
            nowish = Date.now();
            messages.splice(0); // clears them
            req = await _fetch('https://user:password@example.com/?secret=xyzzy');
            await waitLongEnoughForDispatch();
            parts = splitParts(messages);
        });

        test('request succeeded', async () => {
            expect(req.status).to.equal(200);
        })

        test('packet arrived', async () => {
            expect(messages.length).to.equal(1);
        });

        test('secrets were elided', async () => {
            expect(parts.message[2]).to.equal('https://example.com/');
        });
    });

    experiment('data after rsyslog', () => {
        let req;
        let message = '';

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            const _fetch = hook(fetch, hooks.rsyslog({
                target_host: address,
                target_port: port,
                appname: 'appname'
            }), hooks.data);
            messages.splice(0); // clears them
            req = await _fetch('data:text/ascii;base64,TUlORCBCTE9XTg==');
            await waitLongEnoughForDispatch();

            if (messages.length > 0) {
                const bomIndex = messages[0].indexOf(new Buffer('EFBBBF', 'hex'));
                const header = messages[0].slice(0, bomIndex);
                message = messages[0].slice(bomIndex + 3).toString('utf-8');
            }
        });

        test('request succeeded', async () => {
            expect(req.status).to.equal(200);
        })

        test('packet arrived', async () => {
            expect(messages.length).to.equal(1);
        });

        test('message', async () => {
            expect(message).to.match(/^200 GET data:\.{3,3} ms=[0-9] len=10$/);
        });
    });

    experiment('data before rsyslog', () => {
        let req;

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            const _fetch = hook(fetch, hooks.rsyslog({
                target_host: address,
                target_port: port,
                appname: 'appname'
            }), hooks.data);
            messages.splice(0); // clears them
            req = await _fetch('data:text/ascii;base64,TUlORCBCTE9XTg==');
            await waitLongEnoughForDispatch();
        });

        test('request succeeded', async () => {
            expect(req.status).to.equal(200);
        })

        test('no packet arrived', async () => {
            expect(messages.length).to.equal(1);
        });
    });
});

async function waitLongEnoughForDispatch() {
    await new Promise(cb => setTimeout(cb, 5));
    return;
}

function splitParts(messages) {
    if (messages.length < 1) {
        return {
            message: [],
            header: [],
        };
    }
    const bomIndex = messages[0].indexOf(new Buffer('EFBBBF', 'hex'));
    const header = messages[0].slice(0, bomIndex);
    const message = messages[0].slice(bomIndex + 3);
    return {
        message: message.toString('utf-8').split(' '),
        header: header.toString('ascii').split(' '),
    };
}
