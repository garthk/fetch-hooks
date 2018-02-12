'use strict';

const joi = require('joi');
const upstream = require('node-fetch');

const fetchHookManagerConfig = joi.object({
    hooks: joi.array().items(joi.func()).default([]),
    upstream: joi.func().default(upstream).allow(null),
}).label('FetchHookManagerConfig').default();

module.exports = {
    fetchHookManagerConfig,
}
