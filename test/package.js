'use strict';

const { experiment, test } = exports.lab = require('lab').script();
const { expect } = require('code');

const FetchHookManager = require('../lib');

experiment('package exports', () => {
    test('a function', async () => {
        expect(FetchHookManager).to.be.a.function()
        expect(FetchHookManager.name).to.equal('FetchHookManager');
    });
});
