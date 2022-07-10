import { AsObject, IpcMethodHandler } from '@david.uhlir/ipc-method';
export declare class MasterHandler<T extends Object> {
    protected readonly receiverFactory: () => Promise<T> | T;
    protected static createdInstance: MasterHandler<any>;
    protected methodHandler: IpcMethodHandler;
    protected receiver: T;
    protected receiverProxyWraper: AsObject<T>;
    static Initialize<T extends Object>(receiverFactory: () => Promise<T> | T): MasterHandler<T>;
    static getInstance<T extends Object>(): MasterHandler<T>;
    protected constructor(receiverFactory: () => Promise<T> | T);
    protected initialize(): Promise<void>;
    get tx(): AsObject<T>;
}
