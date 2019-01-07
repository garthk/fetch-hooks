import { Agent } from 'https';
import { Readable } from 'stream';
import { RemoteSyslogOptions } from 'rsyslog';
import { S3 } from 'aws-sdk';

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
    export function s3(s3: S3, options: { baseURI?: string; acl?: string }): FetchHook;

    /**
     * Report activity to a remote syslog daemon over UDP. `options` are
     * mainly for `rsyslog`, except `elide` which specifies a function to
     * remove secrets from a URL. The default is to remove the `auth` and
     * `query` components so you don't have to later scramble to flush
     * those from your logs.
     */
    export function rsyslog(options: RemoteSyslogOptions & { elide(url: string): string }): FetchHook;
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
    Request: {
        new(input: string | Request, init?: RequestInit): Request;
    }

    /**
     * The `node-fetch` implementation of the WhatWG `Response`.
     */
    Response: {
        new(body?: BodyInit, init?: ResponseInit): Response;
        // static `error` not present in `node-fetch`
        // static `redirect` not present in `node-fetch`
    };

    /**
     * The `node-fetch` implementation of the WhatWG `Headers`.
     */
    Headers: {
        new(init?: Headers | string[][] | object): Headers;
    };
}

/**
 * The following global interfaces are, unless noted otherwise:
 *
 * - Copied from `https://github.com/Microsoft/TypeScript/blob/master/lib/lib.es2017.full.d.ts`
 * - Copyright (c) Microsoft Corporation with all rights reserved
 * - Apache licensed
 */
interface GlobalFetch {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

interface RequestInit { // node-fetch
    body?: BodyInit;
    agent?: Agent;
    compress?: boolean;
    follow?: number;
    size?: number;
    timeout?: number;
}

interface RequestInit {
    // body?: any; // see node-fetch RequestInit above
    cache?: RequestCache;
    credentials?: RequestCredentials;
    headers?: Headers | string[][] | {[key:string]: string}; // https://github.github.io/fetch/
    integrity?: string;
    keepalive?: boolean;
    method?: string;
    mode?: RequestMode;
    redirect?: RequestRedirect;
    referrer?: string;
    referrerPolicy?: ReferrerPolicy;
    window?: any;
}

interface Request { // node-fetch extensions
    agent?: Agent;
    compress: boolean;
    counter: number;
    follow: number;
    hostname: string;
    port?: number;
    protocol: string;
    size: number;
    timeout: number;
}

interface Request extends Object, Body {
    readonly cache: RequestCache;
    readonly credentials: RequestCredentials;
    readonly destination: RequestDestination;
    readonly headers: Headers;
    readonly integrity: string;
    readonly keepalive: boolean;
    readonly method: string;
    readonly mode: RequestMode;
    readonly redirect: RequestRedirect;
    readonly referrer: string;
    readonly referrerPolicy: ReferrerPolicy;
    readonly type: RequestType;
    readonly url: string;
    clone(): Request;
}

interface ResponseInit {
    headers?: Headers | string[][];
    status?: number;
    statusText?: string;
    url?: string; // node-fetch
}

type BodyInit = ArrayBuffer | ArrayBufferView | string | NodeJS.ReadableStream; // node-fetch
type ReferrerPolicy = "" | "no-referrer" | "no-referrer-when-downgrade" | "origin-only" | "origin-when-cross-origin" | "unsafe-url";
type RequestCache = "default" | "no-store" | "reload" | "no-cache" | "force-cache";
type RequestCredentials = "omit" | "same-origin" | "include";
type RequestDestination = "" | "document" | "sharedworker" | "subresource" | "unknown" | "worker";
type RequestInfo = Request | string;
type RequestMode = "navigate" | "same-origin" | "no-cors" | "cors";
type RequestRedirect = "follow" | "error" | "manual";
type RequestType = "" | "audio" | "font" | "image" | "script" | "style" | "track" | "video";
type ResponseType = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect";
type MediaKeyStatus = "usable" | "expired" | "output-downscaled" | "output-not-allowed" | "status-pending" | "internal-error";

interface Headers {
    append(name: string, value: string): void;
    delete(name: string): void;
    forEach(callback: ForEachCallback): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
}

interface ForEachCallback {
    (keyId: any, status: MediaKeyStatus): void;
}

interface Response extends Object, Body {
    readonly body: NodeJS.ReadableStream | null; // adapted for node-fetch
    readonly headers: Headers;
    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly type: ResponseType;
    readonly url: string;
    readonly redirected: boolean;
    clone(): Response;
}

interface Body {
    readonly bodyUsed: boolean;
    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>; // missing from @types/node-fetch but present in node-fetch
    json(): Promise<any>;
    json<T>(): Promise<T>; // node-fetch
    text(): Promise<string>;
    // formData(): Promise<FormData>; // not supported by node-fetch
}

interface Blob {
    readonly size: number;
    readonly type: string;
    msClose(): void;
    msDetachStream(): any;
    slice(start?: number, end?: number, contentType?: string): Blob;
}
