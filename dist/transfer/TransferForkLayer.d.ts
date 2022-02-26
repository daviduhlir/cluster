import { TransferIPCLayer } from './TransferIPCLayer';
export interface ForkConfig {
    PING_INTERVAL?: number;
    PING_MAX_TIME?: number;
}
export declare const forkDefaultConfig: {
    PING_INTERVAL: number;
    PING_MAX_TIME: number;
};
export declare class TransferForkLayer extends TransferIPCLayer {
    readonly args: {
        [anything: string]: any;
    };
    readonly config: ForkConfig;
    constructor(args?: {
        [anything: string]: any;
    }, config?: ForkConfig);
    stop(): void;
    restart(): void;
    ping(): void;
    protected living: boolean;
    protected pingInterval: any;
    protected resetPing(): void;
    protected setWorker(worker: any): void;
}
