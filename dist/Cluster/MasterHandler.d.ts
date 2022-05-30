import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer';
import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer';
import { HandlersMap } from '../utils/types';
export declare class MasterHandler<T extends HandlersMap> {
    protected readonly handlers: T;
    protected static alreadyInitialized: boolean;
    protected receiverLayer: RPCReceiverLayer;
    protected transmitLayer: RPCTransmitLayer;
    static Initialize<T extends HandlersMap>(initializators: T): MasterHandler<T>;
    protected constructor(handlers: T);
    get call(): T;
}
