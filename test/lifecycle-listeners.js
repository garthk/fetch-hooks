'use strict';

const { experiment, test, before, after } = exports.lab = require('lab').script();
const { expect } = require('code');
const { hook, fetch } = require('../lib');
const nock = require('nock');

experiment('lifecycle event listeners', () => {
    experiment('happy path: well behaved listeners on successful request', () => {
        const prereqs = [];
        const postreqs = [];
        const errors = [];
        let err;
        let nowish;
        let req;

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            nock('https://example.com').get('/').reply(200, 'hello');

            async function watch(request) {
                return {
                    prereq: (... args) => prereqs.push(args),
                    postreq: (... args) => postreqs.push(args),
                    error: (... args) => errors.push(args),
                };
            }

            nowish = Date.now();
            const _fetch = hook(fetch, watch);
            req = await _fetch('https://example.com');
        });

        test('request succeeded', async () => {
            expect(req.status).to.equal(200);
        })

        test('prereq listener called once', async () => {
            expect(prereqs, 'calls').to.have.length(1);
        });

        test('prereq call got request argument', async () => {
            expect(prereqs[0][0].url, 'request.url').to.equal('https://example.com/');
        });

        test('prereq call got timestamp argument', async () => {
            expect(prereqs[0][1], 'timestamp').to.be.a.number().min(nowish).max(nowish + 100);
        });

        test('postreq listener called once', async () => {
            expect(postreqs, 'calls').to.have.length(1);
        });

        test('postreq call got request argument', async () => {
            expect(postreqs[0][0].url, 'request.url').to.equal('https://example.com/');
        });

        test('postreq call got a response argument', async () => {
            expect(postreqs[0][1], 'response').to.not.equal(null);
            expect(postreqs[0][1].ok, 'response.ok').to.equal(true);
            expect(postreqs[0][1].url, 'response.url').to.equal('https://example.com/');
        });

        test('postreq call got no error argument', async () => {
            expect(postreqs[0][2], 'error').to.equal(null);
        });

        test('error listener not called', async () => {
            expect(errors, 'calls').to.have.length(0);
        });
    });

    experiment('no upstream', () => {
        const prereqs = [];
        const postreqs = [];
        const errors = [];
        let err;
        let nowish;

        before(async () => {
            async function watch(request) {
                return {
                    prereq: (... args) => prereqs.push(args),
                    postreq: (... args) => postreqs.push(args),
                    error: (... args) => errors.push(args),
                };
            }

            const fetch = hook(null, watch);
            nowish = Date.now();
            await expect(fetch('https://example.com'))
                .rejects(Error, 'No hook permits access to: https://example.com/');
        });

        test('prereq listener called once', async () => {
            expect(prereqs, 'calls').to.have.length(1);
        });

        test('postreq listener called once', async () => {
            expect(postreqs, 'calls').to.have.length(1);
        });

        test('postreq call got request argument', async () => {
            expect(postreqs[0][0].url, 'request.url').to.equal('https://example.com/');
        });

        test('postreq call got no response argument', async () => {
            expect(postreqs[0][1], 'response').to.equal(null);
        });

        test('postreq call got an error argument', async () => {
            expect(postreqs[0][2], 'error').to.be.an.instanceof(Error);
        });

        test('error listener not called', async () => {
            expect(errors, 'calls').to.have.length(0);
        });
    });

    experiment('crashing prereq listener', () => {
        const prereqs = [];
        const postreqs = [];
        const errors = [];
        let err;
        let req;

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            nock('https://example.com').get('/').reply(200, 'hello');

            async function watch(request) {
                return {
                    prereq: (... args) => {
                        prereqs.push(args);
                        throw new Error('dang');
                    },
                    postreq: (... args) => postreqs.push(args),
                    error: (... args) => errors.push(args),
                };
            }

            const _fetch = hook(fetch, watch);
            req = await _fetch('https://example.com');
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('request succeeded anyway', async () => {
            expect(req.status).to.equal(200);
        })

        test('prereq listener called once', async () => {
            expect(prereqs, 'calls').to.have.length(1);
        });

        test('postreq listener called once', async () => {
            expect(postreqs, 'calls').to.have.length(1);
        });

        test('postreq call got no error argument', async () => {
            expect(postreqs[0][2], 'error').to.equal(null);
        });

        test('error listener called once', async () => {
            expect(errors, 'calls').to.have.length(1);
        });
    });

    experiment('crashing postreq listener', () => {
        const prereqs = [];
        const postreqs = [];
        const errors = [];
        let err;
        let req;

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            nock('https://example.com').get('/').reply(200, 'hello');

            async function watch(request) {
                return {
                    prereq: (... args) => prereqs.push(args),
                    postreq: (... args) => {
                        postreqs.push(args);
                        throw new Error('dang');
                    },
                    error: (... args) => errors.push(args),
                };
            }

            const _fetch = hook(fetch, watch);
            req = await _fetch('https://example.com');
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('request succeeded anyway', async () => {
            expect(req.status).to.equal(200);
        })

        test('prereq listener called once', async () => {
            expect(prereqs, 'calls').to.have.length(1);
        });

        test('postreq listener called once', async () => {
            expect(postreqs, 'calls').to.have.length(1);
        });

        test('postreq call got no error argument', async () => {
            expect(postreqs[0][2], 'error').to.equal(null);
        });

        test('error listener called once', async () => {
            expect(errors, 'calls').to.have.length(1);
        });
    });

    experiment('crashing postreq listener', () => {
        const prereqs = [];
        const postreqs = [];
        const errors = [];
        let err;
        let req;

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            nock('https://example.com').get('/').reply(200, 'hello');

            async function watch(request) {
                return {
                    prereq: (... args) => prereqs.push(args),
                    postreq: (... args) => {
                        postreqs.push(args);
                        throw new Error('dang');
                    },
                    error: (... args) => errors.push(args),
                };
            }

            const _fetch = hook(fetch, watch);
            req = await _fetch('https://example.com');
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
        });

        test('request succeeded anyway', async () => {
            expect(req.status).to.equal(200);
        })

        test('prereq listener called once', async () => {
            expect(prereqs, 'calls').to.have.length(1);
        });

        test('postreq listener called once', async () => {
            expect(postreqs, 'calls').to.have.length(1);
        });

        test('postreq call got no error argument', async () => {
            expect(postreqs[0][2], 'error').to.equal(null);
        });

        test('error listener called once', async () => {
            expect(errors, 'calls').to.have.length(1);
        });

        test('error listener call got an error argument', async () => {
            expect(errors[0][0], 'error').to.be.an.instanceof(Error);
            expect(errors[0][0].message, 'error.message').to.equal('dang');
        });
    });

    experiment('crashing postreq listener and no error listener', () => {
        const errors = [];
        let err;
        let req;

        function onUncaughtException(err) {
            errors.push(err);
        }

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            nock('https://example.com').get('/').reply(200, 'hello');

            async function watch(request) {
                return {
                    postreq: (... args) => {
                        throw new Error('dang');
                    },
                };
            }

            const _fetch = hook(fetch, watch);
            process.removeAllListeners('uncaughtException'); // otherwise lab will whine
            process.once('uncaughtException', onUncaughtException);
            req = await _fetch('https://example.com');
            await waitLongEnoughForDispatch();
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
            process.removeListener('uncaughtException', onUncaughtException);
        });

        test('request succeeded anyway', async () => {
            expect(req.status).to.equal(200);
        })

        test('process emitted uncaughtException once', async () => {
            expect(errors).to.have.length(1);
            expect(errors[0], 'error').to.be.an.instanceof(Error);
            expect(errors[0].message, 'error.message').to.equal('dang');
        });
    });

    experiment('crashing postreq listener and crashing error listener', () => {
        const errors = [];
        let err;
        let req;

        function onUncaughtException(err) {
            errors.push(err);
        }

        before(async () => {
            nock.cleanAll();
            nock.disableNetConnect();
            nock('https://example.com').get('/').reply(200, 'hello');

            async function watch(request) {
                return {
                    postreq: (... args) => {
                        throw new Error('failed to record the response');
                    },
                    error: (... args) => {
                        throw new Error('failed to record the error');
                    },
                };
            }

            const _fetch = hook(fetch, watch);
            process.removeAllListeners('uncaughtException'); // otherwise lab will whine
            process.on('uncaughtException', onUncaughtException);
            req = await _fetch('https://example.com');
            await waitLongEnoughForDispatch();
        });

        after(async () => {
            nock.cleanAll();
            nock.enableNetConnect();
            process.removeListener('uncaughtException', onUncaughtException);
        });

        test('request succeeded anyway', async () => {
            expect(req.status).to.equal(200);
        })

        test('process emitted uncaughtException twice', async () => {
            expect(errors).to.have.length(2);
        });

        test('first uncaughtException was the postreq handler\'s', async () => {
            expect(errors[0], 'error').to.be.an.instanceof(Error);
            expect(errors[0].message, 'error.message').to.equal('failed to record the response');
        });

        test('second uncaughtException wasn\'t', async () => {
            expect(errors[1], 'error').to.be.an.instanceof(Error);
            expect(errors[1].message, 'error.message').to.equal('failed to record the error');
        });
    });
});

async function waitLongEnoughForDispatch() {
    await new Promise(cb => setTimeout(cb, 5));
    return;
}
