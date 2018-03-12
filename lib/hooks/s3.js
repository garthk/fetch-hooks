const fetch =  require('../fetch');
const { parse } =  require('url');
const { changeUrlOnly, bodyMatters } = require('../helpers');
const debug = require('../debug');

/**
 * Pretend to require the AWS SDK so the typings in this file work.
 */
function nope() {
    require('aws-sdk');
}

/**
 * Map HTTP verbs to S3 operations.
 */
const OP_MAP = {
    DELETE: 'deleteObject',
    GET: 'getObject',
    HEAD: 'headObject',
    PUT: 'putObject',
};

/**
 * Make a hook for handling `s3:` URLs.
 *
 * @param {AWS.S3} s3 The S3 Service instance
 * @param {string} [base] The base URI qualifying this hook
 * @param {string} [acl] The default ACL to use for PUT items
 */
module.exports = function makeS3Hook(s3, base, acl) {
    debug('makeS3Hook', base, acl);

    acl = acl || 'private';
    base = base || 's3://';
    return s3Hook;

    /**
     * Hook so `fetch` can handle `s3:` URIs.
     *
     * @param {Request} request
     */
    async function s3Hook(request) {
        debug('s3Hook', request.method, request.url);

        if (base && request.url.slice(0, base.length) !== base) {
            return null;
        }

        const { hostname, pathname } = parse(request.url);
        const bucket = hostname;
        const key = pathname.split('/').filter(segment => segment).join('/');
        const method = request.method.toUpperCase();
        const operation = OP_MAP[method];
        if (!operation) {
            throw new Error(`s3 hook: unsupported HTTP verb ${method}`);
        }
        const params = {
            Bucket: hostname,
            Key: key,
        };
        const url = await getSignedUrl(s3, operation, params);
        request = await changeUrlOnly(request, url);

        if (bodyMatters(request) && !request.headers.get('x-amz-acl')) {
            request.headers.set('x-amz-acl', acl);
        }

        return { request };
    };
};

/**
 * Get a signed URL for an S3 operation, using a Promise-shaped API.
 *
 * @param {AWS.S3} s3 The S3 Service instance
 * @param {string} operation The operation
 * @param {any} params The operation's parameters
 * @return {Promise<string>}
 */
function getSignedUrl(s3, operation, params) {
    debug('getSignedUrl', operation, params);
    return new Promise((resolve, reject) => s3.getSignedUrl(operation, params, (err, url) => {
        if (err) {
            reject(err);
        } else {
            resolve(url);
        }
    }));
}