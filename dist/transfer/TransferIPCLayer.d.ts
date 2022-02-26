/// <reference types="node" />
import { Worker } from 'cluster';
import { EventEmitter } from 'events';
export declare type RxConsumer = (message: any) => Promise<Object>;
export declare type ArgumentTypes<T> = T extends (...args: infer U) => infer R ? U : never;
export declare type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
export declare type AsObject<T> = {
    [K in keyof T]: (...a: ArgumentTypes<T[K]>) => T[K] extends (...args: any) => Promise<any> ? (T[K]) : T[K] extends (...args: any) => any ? (Promise<ReturnType<T[K]>>) : never;
};
export interface IPCTransferMessage {
    id?: string;
    type: 'rpcCall';
    method: string;
    args: any;
    stackTrace: string;
}
export declare const EVENT_WORKER_CHANGED = "EVENT_WORKER_CHANGED";
export declare class TransferIPCLayer extends EventEmitter {
    constructor(worker: any);
    get worker(): Worker | NodeJS.Process;
    send(messageToSend: IPCTransferMessage): Promise<any>;
    addRxConsumer(consumer: RxConsumer): void;
    removeRxConsumer(consumer: RxConsumer): void;
    call(method: string, args: any[], stackTrace?: string): Promise<any>;
    as<T>(): AsObject<T>;
    protected static IPC_MESSAGE_HEADER: string;
    protected attachedWorker: Worker | NodeJS.Process;
    protected rxConsumers: RxConsumer[];
    protected setWorker(worker: any): void;
    protected handleIncommingMessage: (message: IPCTransferMessage) => Promise<void>;
}
