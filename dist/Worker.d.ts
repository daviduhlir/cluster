/// <reference types="node" />
import * as cluster from 'cluster';
import { ForkConfig, TransferForkLayer } from './transfer/TransferForkLayer';
import { AsObject, TransferIPCLayer } from './transfer/TransferIPCLayer';
import { TransferRxAdapter } from './transfer/TransferRxAdapter';
export declare const SUCCESS_INIT_FLAG = "SUCCESS_INIT_FLAG";
export interface ForkInitializator {
    initialize: (id: string) => Promise<void>;
}
export declare class Worker<TParams = any, TWorker = any> {
    readonly params: TParams;
    readonly forkHandlerConfig?: ForkConfig;
    protected id: string;
    protected forkHandler: TransferForkLayer;
    protected masterHandler: TransferIPCLayer;
    protected TransferRxAdapter: TransferRxAdapter;
    constructor(params: TParams, forkHandlerConfig?: ForkConfig);
    private init;
    private callInitializeWorkerFork;
    get fork(): AsObject<TWorker>;
    get worker(): cluster.Worker;
    protected initWorker<T>(params: TParams, master: AsObject<T>): Promise<TWorker>;
    protected workerUnmounted(): Promise<void>;
    protected workerMounted(): Promise<void>;
}
