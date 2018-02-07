'use strict';

const joi = require('joi');
const upstream = require('node-fetch');

const fetchHookManagerConfig = joi.object({
    hooks: joi.array().items(joi.func()).default([]),
    upstream: joi.func().default(upstream).allow(null),
})
.label('FetchHookManagerConfig')
.default();

// TODO loosen if not exporting
const body = joi.object({
    bodyUsed: joi.boolean(),
    arrayBuffer: joi.func(),
    blob: joi.func(),
    json: joi.func(),
    text: joi.func(),
    formData: joi.func(),
})
.label('WhatWG Fetch Body')
.requiredKeys([
    'text'
])
.unknown(true);

// TODO loosen if not exporting
const response = body.keys({
    body: joi.object().unknown(true).allow(null),
    headers: joi.object().unknown(true),
    ok: joi.boolean(),
    status: joi.number(),
    statusText: joi.string(),
    url: joi.string(),
    redirected: joi.boolean(),
    type: joi.string(),
    clone: joi.func(),
})
.label('WhatWG Fetch Response');

// TODO loosen if not exporting
const request = body.keys({
    cache: joi.string(),
    credentials: joi.string(),
    destination: joi.string(),
    headers: joi.object(),
    integrity: joi.string(),
    keepalive: joi.boolean(),
    method: joi.string(),
    mode: joi.string(),
    redirect: joi.string(),
    referrer: joi.string(),
    referrerPolicy: joi.string(),
    type: joi.string(),
    url: joi.string(),
})
.label('WhatWG Fetch Request');

const fetchHookResponse = joi.object({
    response,
    request,
})
.allow(null)
.default(null)
.xor([ 'request', 'response' ])
.label('Fetch Hook Response');

module.exports = {
    //body,
    //request,
    //response,
    fetchHookResponse,
    fetchHookManagerConfig,
}
