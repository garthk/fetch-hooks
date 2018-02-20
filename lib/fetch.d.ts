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
