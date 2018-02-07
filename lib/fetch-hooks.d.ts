/**
 * A `FetchHook` return value, containing either a `request` or a
 * `response` property.
 */
interface FetchHookResponse {
    /** A modified `Request` for subsequent hooks. */
    request?: Request;

    /** A final `Response`. */
    response?: Response;
}

/**
 * Hooks `fetch` by returning a modified `request`, a final `response`,
 * or `null` to pass to the next hook.
 */
interface FetchHook {
    /**
     * Returns either:
     * - null
     * - an object with a `request` property to replace the argument for
     *   subsequent hooks
     * - an object with a `response` property to return immediately
     * @param {RequestInfo} request The initial request
     * @returns {Promise<FetchHookResponse>}
     */
    (request: Request): Promise<FetchHookResponse>;
}

/**
 * Configuration for `FetchHookManager`.
 */
interface FetchHookManagerConfig {
    /**
     * An array of `FetchHook` functions.
     */
    hooks?: FetchHook[];

    /**
     * The upstream `fetch`. Set to `null` to fail closed if no hooks
     * return an object with a `response` property.
     */
    upstream?: GlobalFetch['fetch'];
}
