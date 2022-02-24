import { IPCTransferMessage, TransferIPCLayer } from './TransferIPCLayer';
import { MethodNotFound, TrasferedError } from '../utils/Errors';
import { extractFilename, filterFiles } from '../utils/stackTrace';

/**
 * Receiver class is for object, where can be called methods remotly.
 * If you want to return somethinf from method, you must return it in promise.
 */
export class TransferRxAdapter {
    /**
     * Creates Receiver with worker and tag
     * If worker is not specified it will be set to cluster on master process and process in child process.
     * If tag is not specified, tag will be process id.
     * Root is object for calls.
     */
    constructor(
        protected receiver: Object,
        public readonly transferLayer: TransferIPCLayer,
    ) {
        this.transferLayer.addRxConsumer(this.clusterHandleMessage);
    }

    public destroy() {
        this.transferLayer.removeRxConsumer(this.clusterHandleMessage);
    }

    /**
     * Handle incoming message.
     */
    protected clusterHandleMessage = async (message: IPCTransferMessage): Promise<Object> => {
        if (message.type === 'rpcCall' && message.args && message.method) {
            // no root? nothing to do
            if (!this.receiver) {
                throw new Error('Receiver is not set');
            }
            if (!this.receiver[message.method]) {
                const file = extractFilename(Error().stack);
                throw new TrasferedError(new MethodNotFound(`Method ${message.method} was not found on receiver.`), [file]);
            }
            try {
                return await this.receiver[message.method].apply(this.receiver, message.args);
            } catch(e) {
                const file = extractFilename(Error().stack);
                throw new TrasferedError(e, [file]);
            }
        }
    };
}
