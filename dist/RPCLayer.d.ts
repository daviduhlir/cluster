/// <reference types="node" />
import * as cluster from 'cluster';
export declare class RPCTransmitLayer {
    readonly process: NodeJS.Process | cluster.Worker;
    constructor(process: NodeJS.Process | cluster.Worker);
    callMethod(methodName: string, args: any[]): Promise<any>;
    as<T>(): T;
    protected sendRaw(message: any): void;
}
export declare class RPCReceiverLayer {
    protected readonly handlers: {
        [name: string]: (...args: any[]) => Promise<any>;
    };
    readonly process: NodeJS.Process | cluster.Worker;
    protected attached: any[];
    constructor(handlers: {
        [name: string]: (...args: any[]) => Promise<any>;
    }, process?: NodeJS.Process | cluster.Worker);
    attach(process: NodeJS.Process | cluster.Worker): void;
    detach(process: NodeJS.Process | cluster.Worker): void;
    destroy(): void;
    protected handleIncommingMessage: (sender: any, message: any) => Promise<void>;
}
