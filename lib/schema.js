'use strict';

const joi = require('joi');
const upstream = require('node-fetch');

module.exports = {
    hooks: joi.array().items(joi.func()).default([]),
    upstream: joi.func().default(upstream).allow(null),
};
