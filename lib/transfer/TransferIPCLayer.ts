import { Worker } from 'cluster';
import { EventEmitter } from 'events';
import { v1 as uuidv1 } from 'uuid';
import { MessageResultError, MessageTransferRejected } from '../utils/erors';
import { extractFilename, filterFiles } from '../utils/stackTrace';

export type RxConsumer = (message: any) => Promise<Object>;
export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
export type ThenArg<T> = T extends PromiseLike<infer U> ? U : T
export type AsObject<T> = {
    [K in keyof T]: (...a: ArgumentTypes<T[K]>) =>
        T[K] extends (...args: any) => Promise<any> ? (T[K]) : T[K] extends (...args: any) => any ? (Promise<ReturnType<T[K]>>) : never
}

export interface IPCTransferMessage {
    id?: string;
    type: 'rpcCall';
    method: string;
    args: any;
    stackTrace: string;
}

export const EVENT_WORKER_CHANGED = 'EVENT_WORKER_CHANGED';

/**
 * Ipc transfer layer
 */
export class TransferIPCLayer extends EventEmitter {
    constructor(
        worker,
    ) {
        super();
        this.setWorker(worker);
    }

    /**
     * Get worker
     */
    public get worker() {
        return this.attachedWorker;
    }

    /**
     * Send message
     */
    public send(messageToSend: IPCTransferMessage): Promise<any> {
        if (!this.worker) {
            return Promise.reject(new MessageTransferRejected(`Call was rejected, worker is not exists anymore.`, messageToSend.stackTrace))
        }
        return new Promise((resolve, reject) => {
            const id = uuidv1();

            // message handler
            const messageHandler = (message) => {
                if (
                    typeof message === 'object' && !Array.isArray(message) &&
                    message.hasOwnProperty(TransferIPCLayer.IPC_MESSAGE_HEADER) &&
                    message.id === id
                ) {
                    this.removeListener(EVENT_WORKER_CHANGED, rejectHandler);
                    this.worker.removeListener('message', messageHandler);

                    // if there was error, just send transfered error
                    if (message.error) {
                        reject(new MessageResultError(message.error.message, message.error.stack, message.error.originalStack));
                    } else {
                        resolve(message.result);
                    }
                }
            };
            const rejectHandler = (message) => {
                this.removeListener(EVENT_WORKER_CHANGED, rejectHandler);
                this.worker.removeListener('message', messageHandler);
                reject(new MessageTransferRejected(`Call was rejected, due to worker was chenged.`, messageToSend.stackTrace));
            };

            this.worker.addListener('message', messageHandler);
            this.addListener(EVENT_WORKER_CHANGED, rejectHandler);

            this.worker.send({
                [TransferIPCLayer.IPC_MESSAGE_HEADER]: true,
                ...messageToSend,
                id,
            });
        });
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
                    // call message and include call stack to be presented when error occured
                    return this.call(propKey as string, args, filterFiles(Error().stack));
                };
            }
        });
    }

    /**********************************
     *
     * Internal methods
     *
     **********************************/
    protected static IPC_MESSAGE_HEADER = '__transferLayerInternalMessage';
    protected attachedWorker: Worker | NodeJS.Process = null;
    protected rxConsumers: RxConsumer[] = [];

    /**
     * Set worker
     * @param worker
     */
    protected setWorker(worker) {
        let wasAlreadySet = !!this.attachedWorker;
        if (worker) {
            this.attachedWorker = worker;
            this.attachedWorker.removeAllListeners('message');
            this.attachedWorker.addListener('message', this.handleIncommingMessage);
        }
        this.emit(EVENT_WORKER_CHANGED, wasAlreadySet);
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
                        result = await consumer(message);
                        wasSuccess = true;
                    } catch (e) {
                        // get current file to remove it from stack trace
                        const currentFile = extractFilename(Error().stack)

                        // prepare error to be sended back to result
                        error = {
                            message: e.message,
                            stack: filterFiles(e.stack, [currentFile]) + `\n` + message.stackTrace,
                            originalStack: e.original?.stack,
                        };
                    }
                }
            }

            // send result of this call
            this.worker.send({
                [TransferIPCLayer.IPC_MESSAGE_HEADER]: true,
                result,
                error: !wasSuccess ? error : null,
                id: message.id,
            });
        }
    }
}