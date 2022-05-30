import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer';
import { HandlersMap, ArgumentTypes, Await } from '../utils/types';
import { ForkHandler } from './ForkHandler';
export declare class Cluster<T extends HandlersMap> {
    protected readonly initializators: T;
    protected static alreadyInitialized: boolean;
    protected systemReceiverLayer: RPCReceiverLayer;
    protected receiverLayer: RPCReceiverLayer;
    static Initialize<T extends HandlersMap>(initializators: T): Cluster<T>;
    protected constructor(initializators: T);
    get run(): {
        [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ForkHandler<Await<ReturnType<T[K]>>>>;
    };
    protected initializeWorker: (name: string, args: any[]) => Promise<void>;
    protected ping: () => Promise<number>;
}
