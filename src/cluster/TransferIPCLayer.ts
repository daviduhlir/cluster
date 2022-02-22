import { Worker } from 'cluster';
import { v1 as uuidv1 } from 'uuid';
import { extractFilename, filterFiles } from './utils/stackTrace';

export type RxConsumer = (message: any, parentFiles: string[]) => Promise<Object>;
export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
export type ThenArg<T> = T extends PromiseLike<infer U> ? U : T
export type AsObject<T> = {
    [K in keyof T]: (...a: ArgumentTypes<T[K]>) =>
        T[K] extends (...args: any) => Promise<any> ? (T[K]) : T[K] extends (...args: any) => any ? (Promise<ReturnType<T[K]>>) : never
}

export class TransferedError extends Error {
    constructor(message: string, stack: string, originalStack?: string) {
        super(message);
        this.stack = `Error: ${message}\n${stack}`;

        // restore prototype chain
        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any).__proto__ = actualProto;
        }
    }
}

export interface IPCTransferMessage {
    id?: string;
    type: 'rpcCall';
    method: string;
    args: any;
    stackTrace: string;
}

/**
 * Ipc transfer layer
 */
export class TransferIPCLayer {
    protected static IPC_MESSAGE_HEADER = '__transferLayerInternalMessage';
    protected attachedWorker: Worker | NodeJS.Process = null;
    protected rxConsumers: RxConsumer[] = [];

    constructor(
        worker,
    ) {
        this.setWorker(worker);
    }

    /**
     * Get worker
     */
    public get worker() {
        return this.attachedWorker;
    }

    /**
     * Set worker
     * @param worker
     */
    protected setWorker(worker) {
        this.attachedWorker = worker;
        this.attachedWorker.removeAllListeners('message');
        this.attachedWorker.addListener('message', this.handleIncommingMessage);
    }

    /**
     * Send message
     */
    public send(message: IPCTransferMessage): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = uuidv1();

            // message handler
            const messageHandler = (message) => {
                if (
                    typeof message === 'object' && !Array.isArray(message) &&
                    message.hasOwnProperty(TransferIPCLayer.IPC_MESSAGE_HEADER) &&
                    message.id === id
                ) {
                    this.worker.removeListener('message', messageHandler);

                    // TODO Map to proxy with result() function
                    if (message.error) {
                        reject(new TransferedError(message.error.message, message.error.stack, message.error.originalStack));
                    } else {
                        resolve(message.result);
                    }
                }
            };
            this.worker.addListener('message', messageHandler);

            this.worker.send({
                [TransferIPCLayer.IPC_MESSAGE_HEADER]: true,
                ...message,
                id,
            });
        });
    }

    /**
     * Handle incoming message.
     */
    protected handleIncommingMessage = async (message: IPCTransferMessage) => {
        if (
            typeof message === 'object' && !Array.isArray(message) &&
            message.hasOwnProperty(TransferIPCLayer.IPC_MESSAGE_HEADER)
        ) {
            let result = null;
            let error = null;
            let wasSuccess = false;
            if (this.rxConsumers.length) {
                for(const consumer of this.rxConsumers) {
                    try {
                        result = await consumer(message, [extractFilename(Error().stack)]);
                        wasSuccess = true;
                    } catch (e) {
                        error = {
                            message: e.message,
                            stack: e.stack + `\n` + message.stackTrace,
                            originalStack: e.original?.stack,
                        };
                    }
                }
            }

            this.worker.send({
                [TransferIPCLayer.IPC_MESSAGE_HEADER]: true,
                result,
                error: !wasSuccess ? error : null,
                id: message.id,
            });
        }
    }

    /**
     * Add receive listener
     * @param consumer
     */
     public addRxConsumer(consumer: RxConsumer) {
        this.rxConsumers.push(consumer);
    }

    /**
     * Remove receive listener
     * @param consumer
     */
    public removeRxConsumer(consumer: RxConsumer) {
        this.rxConsumers = this.rxConsumers.filter((i) => i !== consumer);
    }

    /**
     * Call process message
     */
     public async call(method: string, args: any[], stackTrace?: string) {
        try {
            return await this.send({
                type: 'rpcCall',
                method,
                args,
                stackTrace,
            });
        } catch(e) {
            throw e;
        }
    }

    /*
     * wrap cluster by template, you can call directly methods on it
     */
    public as<T>(): AsObject<T> {
        return new Proxy(this as any, {
            get: (target, propKey, receiver) => {
                return (...args) => {
                    return this.call(propKey as string, args, filterFiles(Error().stack));
                };
            }
        });
    }
}