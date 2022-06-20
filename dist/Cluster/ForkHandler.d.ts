/// <reference types="node" />
import { IpcMethodHandler } from '@david.uhlir/ipc-method';
import * as cluster from 'cluster';
import { ProcessType } from '../utils/types';
export declare const WORKER_INITIALIZED = "WORKER_INITIALIZED";
export declare const WORKER_DIED = "WORKER_DIED";
export declare const WORKER_RESTARTED = "WORKER_RESTARTED";
export declare const PROCESS_CHANGED = "PROCESS_CHANGED";
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
export declare class ForkHandler<T> extends IpcMethodHandler {
    readonly name: string;
    protected readonly args: any[];
    readonly config: ForkConfig;
    protected isLiving: boolean;
    protected pingInterval: any;
    protected processHandler: ProcessType;
    protected internalIpcTx: IpcMethodHandler;
    constructor(name: string, args: any[], config?: ForkConfig);
    init(): Promise<void>;
    get tx(): import("@david.uhlir/ipc-method").AsObject<T>;
    kill(): void;
    restart(): void;
    set process(process: ProcessType);
    get process(): ProcessType;
    protected get processes(): (NodeJS.Process | cluster.Worker)[];
    protected fork(): void;
    protected handleStop: (code: string, signal: string) => Promise<void>;
    protected resetPing(): void;
    protected stopPing(): void;
    protected ping(): Promise<void>;
}
