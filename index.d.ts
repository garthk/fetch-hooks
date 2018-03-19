import { Agent } from 'https';
import { Readable } from 'stream';
import { RemoteSyslogOptions } from 'rsyslog';

/**
 * Return a new API-compatible WhatWG `fetch`, as interfered with by `hooks`.
 * When called, the returned function calls each hook in order and:
 *
 * - Ignores it if it returns a falsey value
 * - Returns any response it gives
 * - If not, continues with its replacement request
 * - Passes through to `upstream` if no hooks are left
 * - Rejects with an error if `upstream` is `null`

 * @export
 * @param {Fetch} upstream The upstream `fetch`, or `null`
 * @param {...FetchHook[]} hooks Zero or more hook functions
 * @returns {Fetch} An API-compatible `fetch`
 */
export function hook(upstream: Fetch, ... hooks: FetchHook[]): Fetch;

/**
 * A WhatWG-compatible `fetch` from `node-fetch`.
 */
export const fetch: Fetch & NodeFetchBonuses;

/**
 * Predefined hooks.
 */
export namespace hooks {
    /**
     * Dump `curl` command lines to standard error.
     */
    export const curl: FetchHook;

    /**
     * Handle `data:` URIs.
     */
    export const data: FetchHook;

    /**
     * Throw an error if the protocol isn't HTTPS.
     */
    export const httpsOnly: FetchHook;

    /**
     * Handle `file:` URIs.
     */
    export function file(options: { baseURI?: string }): FetchHook;

    /**
     * Handle `s3:` URIs.
     */
    export function s3(options: { baseURI?: string; acl?: string }): FetchHook;

    /**
     * Report activity to a remote syslog daemon over UDP.
     */
    export function rsyslog(options: RemoteSyslogOptions): FetchHook;
}

/**
 * Helpers for hook writers.
 */
export namespace helpers {
    /**
     * Determine if `request.body` matters.
     */
    export function bodyMatters(request: Request): boolean;

    /**
     * Return a new `Request` based on `request`, but with a different `url`.
     */
    export function changeUrlOnly(request: Request, url: string): Request;

    /**
     * Read a string or a buffer as a readable stream..
     */
    export function readString(str: string | Buffer): Readable;
}

/**
 * A fetch hook response.
 * Contains EITHER a modified `request` OR a final `response`.
 * To express neither, return `null`.
 */
interface FetchHookResponse {
    /** A modified `Request` for subsequent hooks or the upstream `fetch` */
    request?: Request;

    /** A final `Response` */
    response?: Response;

    /**
     * A function to call before `request` is passed upstream.
     * Also called if a hook returns a `response`, in which case the
     * `timestamp` will come in handy.
     */
    prereq?: (request: Request, timestamp: number) => void;

    /** A function to call after `request` was passed upstream */
    postreq?: (request: Request, response: Response, err?: Error) => void;

    /** A function to call when a hook, `prereq`, or `postreq` crashes out. */
    error?: (err: Error) => void;
}

/**
 * A `fetch` hook function.
 */
type FetchHook = (request: Request) => Promise<FetchHookResponse>;

/**
 * A WhatWG `fetch` function.
 */
type Fetch = GlobalFetch['fetch'];

/**
 * Bonus members on the `fetch` from `node-fetch`.
 */
interface NodeFetchBonuses {
    /**
     * The `node-fetch` implementation of the WhatWG `Request`.
     */
    Request: new(input: string | Request, init?: RequestInit) => Request;

    /**
     * The `node-fetch` implementation of the WhatWG `Response`.
     */
    Response: new(body?: BodyInit, init?: ResponseInit) => Response;
}

/**
 * Global interfaces.
 */
declare global {
    /**
     * `node-fetch` extensions to the global `RequestInit`
     */
    interface RequestInit {
        agent?: Agent; // TODO: figure out how to more strongly type this
        compress?: boolean;
        follow?: number;
        size?: number;
        timeout?: number;
    }

    /**
     * `node-fetch` extensions to the global `Request`
     */
    interface Request {
        agent?: Agent; // TODO: figure out how to more strongly type this
        compress: boolean;
        counter: number;
        follow: number;
        hostname: string;
        port?: number;
        protocol: string;
        size: number;
        timeout: number;
    }
}
