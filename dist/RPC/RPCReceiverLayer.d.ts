/// <reference types="node" />
import * as cluster from 'cluster';
export declare class RPCReceiverLayer<T extends Object = {}> {
    protected readonly receiver: T;
    constructor(receiver: T);
    protected onClusterChange: ({ oldWorkers, newWorkers }: {
        oldWorkers: cluster.Worker[];
        newWorkers: cluster.Worker[];
    }) => void;
    protected handleIncommingMessage: (message: any) => Promise<void>;
}
