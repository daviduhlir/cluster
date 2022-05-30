import { RPCTransmitLayer, RPCReceiverLayer } from './RPCLayer';
export declare type ArgumentTypes<T> = T extends (...args: infer U) => infer R ? U : never;
export declare type Await<T> = T extends PromiseLike<infer U> ? U : T;
export declare type HandlersMap = {
    [name: string]: (...args: any[]) => Promise<any>;
};
export interface WorkerInitializatorhandler {
    INITIALIZE_WORKER: (name: string, args: any[]) => Promise<void>;
}
export declare class ForkHandler<T> extends RPCTransmitLayer {
    protected readonly name: string;
    protected readonly args: any[];
    protected forkId: string;
    constructor(name: string, args: any[]);
    init(): Promise<void>;
    get id(): string;
    get handler(): T;
}
export declare class Cluster<T extends HandlersMap, K extends HandlersMap = null> {
    protected readonly initializators: T;
    protected readonly handlers: K;
    protected initReceiverLayer: RPCReceiverLayer;
    protected receiverLayer: RPCReceiverLayer;
    protected transmitLayer: RPCTransmitLayer;
    constructor(initializators: T, handlers: K);
    get run(): {
        [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ForkHandler<Await<ReturnType<T[K]>>>>;
    };
    get call(): K;
    protected initializeWorker: (name: string, args: any[]) => Promise<void>;
}
