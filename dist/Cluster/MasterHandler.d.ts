import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer';
import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer';
export declare class MasterHandler<T extends Object> {
    protected readonly receiverFactory: () => Promise<T> | T;
    protected static createdInstance: MasterHandler<any>;
    protected receiverLayer: RPCReceiverLayer;
    protected transmitLayer: RPCTransmitLayer;
    protected receiver: T;
    static Initialize<T extends Object>(receiverFactory: () => Promise<T> | T): MasterHandler<T>;
    static getInstance<T extends Object>(): MasterHandler<T>;
    protected constructor(receiverFactory: () => Promise<T> | T);
    protected initialize(): Promise<void>;
    get call(): T;
}
