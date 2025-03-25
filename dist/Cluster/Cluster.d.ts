import { IpcMethodHandler } from '@david.uhlir/ipc-method';
import { HandlersMap, ArgumentTypes, Await } from '../utils/types';
import { ForkConfig, ForkHandler } from './ForkHandler';
export declare class Cluster<T extends HandlersMap> {
    protected readonly initializators: T;
    protected static alreadyInitialized: boolean;
    protected runningHandlers: {
        [name: string]: ForkHandler<any>[];
    };
    protected systemReceiverLayer: IpcMethodHandler;
    protected receiverLayer: IpcMethodHandler;
    protected static config: ForkConfig;
    static Initialize<T extends HandlersMap>(initializators: T, forkConfig?: ForkConfig): Cluster<T>;
    protected constructor(initializators: T);
    restart(): void;
    get run(): {
        [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ForkHandler<Await<ReturnType<T[K]>>>>;
    };
    getRunningForks(name: string): ForkHandler<any>[];
    protected removeRunningFork(fork: ForkHandler<any>): void;
    protected startFork(name: string, args: any[], config?: ForkConfig): Promise<ForkHandler<any>>;
    protected initializeWorker: (name: string, args: any[]) => Promise<void>;
    protected ping: () => Promise<number>;
}
