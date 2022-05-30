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
export declare class RPCReceiverLayer {
    protected readonly handlers: {
        [name: string]: (...args: any[]) => Promise<any>;
    };
    readonly process: ProcessType;
    protected attached: any[];
    constructor(handlers: {
        [name: string]: (...args: any[]) => Promise<any>;
    }, process?: ProcessType);
    attach(process: ProcessType): void;
    detach(process: ProcessType): void;
    destroy(): void;
    protected handleIncommingMessage: (sender: any, message: any) => Promise<void>;
}
