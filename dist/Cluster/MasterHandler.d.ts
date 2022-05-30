import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer';
import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer';
import { HandlersMap } from '../utils/types';
export declare class MasterHandler<T extends HandlersMap = null> {
    protected readonly handlers: T;
    protected receiverLayer: RPCReceiverLayer;
    protected transmitLayer: RPCTransmitLayer;
    constructor(handlers: T);
    get call(): T;
}
