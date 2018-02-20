'use strict';

const { experiment, test } = exports.lab = require('lab').script();
const { expect } = require('code');

const { hook, fetch } = require('../lib');

experiment('package exports', () => {
    test('hook', async () => {
        expect(hook).to.be.a.function()
    });

    test('fetch', async () => {
        expect(fetch).to.be.a.function()
    });
});
