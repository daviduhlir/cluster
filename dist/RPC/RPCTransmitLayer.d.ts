/// <reference types="node" />
import * as cluster from 'cluster';
import { EventEmitter } from 'events';
export declare type ProcessType = NodeJS.Process | cluster.Worker;
export declare const PROCESS_CHANGED = "PROCESS_CHANGED";
export declare class RPCTransmitLayer extends EventEmitter {
    protected processHandler: ProcessType;
    constructor(process?: ProcessType);
    set process(process: ProcessType);
    get process(): ProcessType;
    as<T>(): T;
    protected callMethod(methodName: string, args: any[]): Promise<any>;
    protected sendRaw(message: any): void;
}
