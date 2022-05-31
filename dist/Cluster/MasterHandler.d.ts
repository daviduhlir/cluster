import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer';
import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer';
export declare class MasterHandler<T extends Object> {
    protected static createdInstance: MasterHandler<any>;
    protected receiverLayer: RPCReceiverLayer;
    protected transmitLayer: RPCTransmitLayer;
    protected receiver: T;
    static Initialize<T extends Object>(receiverFactory: () => T): MasterHandler<T>;
    static getInstance<T extends Object>(): MasterHandler<T>;
    protected constructor(receiverFactory: () => T);
    get call(): T;
}
