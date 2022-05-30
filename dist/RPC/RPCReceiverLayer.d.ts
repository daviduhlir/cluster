/// <reference types="node" />
import * as cluster from 'cluster';
export declare class RPCReceiverLayer {
    protected readonly handlers: {
        [name: string]: (...args: any[]) => Promise<any>;
    };
    constructor(handlers: {
        [name: string]: (...args: any[]) => Promise<any>;
    });
    protected onClusterChange: ({ oldWorkers, newWorkers }: {
        oldWorkers: cluster.Worker[];
        newWorkers: cluster.Worker[];
    }) => void;
    protected handleIncommingMessage: (message: any) => Promise<void>;
}
