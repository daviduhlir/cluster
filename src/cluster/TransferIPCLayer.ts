import { Worker } from 'cluster';
import { v1 as uuidv1 } from 'uuid';

export type RxConsumer = (message: any) => Promise<Object>;
export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
export type ThenArg<T> = T extends PromiseLike<infer U> ? U : T
export type AsObject<T> = {
    [K in keyof T]: (...a: ArgumentTypes<T[K]>) =>
        T[K] extends (...args: any) => Promise<any> ? (T[K]) : T[K] extends (...args: any) => any ? (Promise<ReturnType<T[K]>>) : never
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
    public send(message): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = uuidv1();

            // message handler
            const messageHandler = (message) => {
                if (
                    typeof message === 'object' &&
                    message.hasOwnProperty(TransferIPCLayer.IPC_MESSAGE_HEADER) &&
                    message.id === id
                ) {
                    this.worker.removeListener('message', messageHandler);

                    // TODO Map to proxy with result() function
                    resolve(message.result);
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
    protected handleIncommingMessage = async (message) => {
        if (
            typeof message === 'object' &&
            message.hasOwnProperty(TransferIPCLayer.IPC_MESSAGE_HEADER)
        ) {
            let result = null;
            for(const consumer of this.rxConsumers) {
                try {
                    result = await consumer(message);
                } catch (error) {
                    result = error;
                }
            }

            this.worker.send({
                [TransferIPCLayer.IPC_MESSAGE_HEADER]: true,
                result,
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
     public async call(method: string, args: any[]) {
        try {
            return await this.send({
                type: 'rpcCall',
                method,
                args
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
                    return this.call(propKey as string, args);
                };
            }
        });
    }
}