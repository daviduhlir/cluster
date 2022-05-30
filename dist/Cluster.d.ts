import { RPCTransmitLayer, RPCReceiverLayer } from './RPCLayer';
export declare type ArgumentTypes<T> = T extends (...args: infer U) => infer R ? U : never;
export declare type Await<T> = T extends PromiseLike<infer U> ? U : T;
export declare type HandlersMap = {
    [name: string]: (...args: any[]) => Promise<any>;
};
export declare const WORKER_INITIALIZED = "WORKER_INITIALIZED";
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
    protected readonly name: string;
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
export declare class Cluster<T extends HandlersMap, K extends HandlersMap = null> {
    protected readonly initializators: T;
    protected readonly handlers: K;
    protected systemReceiverLayer: RPCReceiverLayer;
    protected receiverLayer: RPCReceiverLayer;
    protected transmitLayer: RPCTransmitLayer;
    constructor(initializators: T, handlers: K);
    get run(): {
        [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ForkHandler<Await<ReturnType<T[K]>>>>;
    };
    get call(): K;
    protected initializeWorker: (name: string, args: any[]) => Promise<void>;
    protected ping: () => Promise<number>;
}
