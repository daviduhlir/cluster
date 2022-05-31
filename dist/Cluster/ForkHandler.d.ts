import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer';
export declare const WORKER_INITIALIZED = "WORKER_INITIALIZED";
export declare const WORKER_DIED = "WORKER_DIED";
export declare const WORKER_RESTARTED = "WORKER_RESTARTED";
export interface ForkConfig {
    PING_INTERVAL?: number;
    PING_MAX_TIME?: number;
    PING_RESTART_ON_TIMEOUT?: boolean;
}
export declare const forkDefaultConfig: {
    PING_INTERVAL: number;
    PING_MAX_TIME: number;
    PING_RESTART_ON_TIMEOUT: boolean;
};
export interface WorkerSystemHandler {
    INITIALIZE_WORKER: (name: string, args: any[]) => Promise<void>;
    PING: () => Promise<number>;
}
export declare class ForkHandler<T> extends RPCTransmitLayer {
    readonly name: string;
    protected readonly args: any[];
    readonly config: ForkConfig;
    protected isLiving: boolean;
    protected pingInterval: any;
    constructor(name: string, args: any[], config?: ForkConfig);
    init(): Promise<void>;
    get call(): T;
    kill(): void;
    restart(): void;
    protected fork(): void;
    protected handleStop: (code: string, signal: string) => Promise<void>;
    protected resetPing(): void;
    protected stopPing(): void;
    protected ping(): Promise<void>;
}
