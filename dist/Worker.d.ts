/// <reference types="node" />
import * as cluster from 'cluster';
import { ForkConfig } from './transfer/TransferForkLayer';
export interface ForkInitializator {
    initialize: (id: string) => Promise<void>;
}
export declare class Worker<TParams = any, TWorker = any> {
    readonly params: TParams;
    readonly forkHandlerConfig?: ForkConfig;
    protected id: string;
    protected forkHandler: cluster.Worker;
    protected workerReceiver: any;
    constructor(params?: TParams, forkHandlerConfig?: ForkConfig);
    private init;
    protected initWorker(): Promise<TWorker>;
    protected workerUnmounted(): Promise<void>;
    protected workerMounted(): Promise<void>;
}
