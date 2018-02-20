'use strict';

const { experiment, test } = exports.lab = require('lab').script();
const { expect } = require('code');

const { hook } = require('../lib');

experiment('with no hooks and no upstream', () => {
    test('await fetch leads to rejection', async () => {
        const fetch = hook(null);

        await expect(fetch('https://example.com'))
            .rejects(Error, 'No hook permits access to: https://example.com/');
    });
});
