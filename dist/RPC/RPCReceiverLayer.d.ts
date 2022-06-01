/// <reference types="node" />
import * as cluster from 'cluster';
export declare class RPCReceiverLayer<T extends Object = {}> {
    protected readonly receiver: T;
    static receivers: {
        [hash: string]: RPCReceiverLayer<any>;
    };
    static attached: boolean;
    protected receiverHash: string;
    constructor(receiver: T);
    destroy(): void;
    protected hasMethod(name: string): boolean;
    protected callMethod(name: string, args: any[]): Promise<any>;
    protected static onClusterChange({ oldWorkers, newWorkers }: {
        oldWorkers: cluster.Worker[];
        newWorkers: cluster.Worker[];
    }): void;
    protected static getReceivers(): RPCReceiverLayer<any>[];
    protected static handleIncommingMessage(message: any): Promise<void>;
}
