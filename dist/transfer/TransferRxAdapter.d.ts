import { IPCTransferMessage, TransferIPCLayer } from './TransferIPCLayer';
export declare class TransferRxAdapter {
    protected receiver: Object;
    readonly transferLayer: TransferIPCLayer;
    constructor(receiver: Object, transferLayer: TransferIPCLayer);
    destroy(): void;
    protected clusterHandleMessage: (message: IPCTransferMessage) => Promise<Object>;
}
