import { IPCTransferMessage, TransferIPCLayer } from './TransferIPCLayer';
import { extractFilename, filterFiles } from './utils/stackTrace';

/**
 * Error when method on receiver was not found
 */
export class MethodNotFound extends Error {
    constructor(message?: string) {
        super(message);

        // restore prototype chain
        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any).__proto__ = actualProto;
        }
    }
}

export class TrasferedError extends Error {
    constructor(public readonly original: Error) {
        super(original.message);
        const file = extractFilename(Error().stack);
        this.stack = filterFiles(original.stack, [file]);

        // restore prototype chain
        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any).__proto__ = actualProto;
        }
    }
}

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
                throw new TrasferedError(new MethodNotFound(`Method ${message.method} was not found on receiver.`));
            }
            try {
                return await this.receiver[message.method].apply(this.receiver, message.args);
            } catch(e) {
                const file = extractFilename(Error().stack);
                throw new TrasferedError(e);
            }
        }
    };
}
