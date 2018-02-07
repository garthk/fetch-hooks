// Alternative definitions for node-fetch 0.0
// Project: https://github.com/bitinn/node-fetch

declare module 'node-fetch' {
    import { Agent } from 'http';

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

    declare interface FetchWithBonuses {
        (input: RequestInfo, init?: RequestInit): Promise<Response>;
        Request: typeof Request;
        Headers: typeof Headers;
        Response: typeof Response;
    }
    declare const _fetch: FetchWithBonuses;
    export = _fetch;
}
