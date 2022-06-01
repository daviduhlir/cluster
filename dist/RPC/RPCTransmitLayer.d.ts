/// <reference types="node" />
import { EventEmitter } from 'events';
import { ProcessType } from '../utils/types';
export declare const PROCESS_CHANGED = "PROCESS_CHANGED";
export declare class RPCTransmitLayer extends EventEmitter {
    protected processHandler: ProcessType;
    constructor(process?: ProcessType);
    set process(process: ProcessType);
    get process(): ProcessType;
    as<T>(): T;
    protected callMethodWithFirstResult(methodName: string, args: any[]): Promise<any>;
    protected callMethod(methodName: string, args: any[]): Promise<{
        result?: any;
        error?: any;
        CALL_STATUS: string;
    }[]>;
    protected sendRaw(message: any): void;
}
