/** @type {any} */
const _fetch =  require('node-fetch');

/**
 * @typedef {object} NodeFetchBonuses
 * @property {{new(input: string | Request, init?: RequestInit): Request}} Request
 * @property {{new(body?: BodyInit, init?: ResponseInit): Response}} Response
 */

/** @type {GlobalFetch['fetch'] & NodeFetchBonuses} */
module.exports = _fetch;
