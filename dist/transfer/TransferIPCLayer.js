"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const uuid_1 = require("uuid");
const erors_1 = require("../utils/erors");
const stackTrace_1 = require("../utils/stackTrace");
exports.EVENT_WORKER_CHANGED = 'EVENT_WORKER_CHANGED';
class TransferIPCLayer extends events_1.EventEmitter {
    constructor(worker) {
        super();
        this.attachedWorker = null;
        this.rxConsumers = [];
        this.handleIncommingMessage = async (message) => {
            if (typeof message === 'object' && !Array.isArray(message) &&
                message.hasOwnProperty(TransferIPCLayer.IPC_MESSAGE_HEADER)) {
                let result = null;
                let error = null;
                let wasSuccess = false;
                if (this.rxConsumers.length) {
                    for (const consumer of this.rxConsumers) {
                        try {
                            result = await consumer(message);
                            wasSuccess = true;
                        }
                        catch (e) {
                            const currentFile = stackTrace_1.extractFilename(Error().stack);
                            error = {
                                message: e.message,
                                stack: stackTrace_1.filterFiles(e.stack, [currentFile]) + `\n` + message.stackTrace,
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
        };
        this.setWorker(worker);
    }
    get worker() {
        return this.attachedWorker;
    }
    send(messageToSend) {
        if (!this.worker) {
            return Promise.reject(new erors_1.MessageTransferRejected(`Call was rejected, worker is not exists anymore.`, messageToSend.stackTrace));
        }
        return new Promise((resolve, reject) => {
            const id = uuid_1.v1();
            const messageHandler = (message) => {
                if (typeof message === 'object' && !Array.isArray(message) &&
                    message.hasOwnProperty(TransferIPCLayer.IPC_MESSAGE_HEADER) &&
                    message.id === id) {
                    this.removeListener(exports.EVENT_WORKER_CHANGED, rejectHandler);
                    this.worker.removeListener('message', messageHandler);
                    if (message.error) {
                        reject(new erors_1.MessageResultError(message.error.message, message.error.stack, message.error.originalStack));
                    }
                    else {
                        resolve(message.result);
                    }
                }
            };
            const rejectHandler = (message) => {
                this.removeListener(exports.EVENT_WORKER_CHANGED, rejectHandler);
                this.worker.removeListener('message', messageHandler);
                reject(new erors_1.MessageTransferRejected(`Call was rejected, due to worker was chenged.`, messageToSend.stackTrace));
            };
            this.worker.addListener('message', messageHandler);
            this.addListener(exports.EVENT_WORKER_CHANGED, rejectHandler);
            this.worker.send({
                [TransferIPCLayer.IPC_MESSAGE_HEADER]: true,
                ...messageToSend,
                id,
            });
        });
    }
    addRxConsumer(consumer) {
        this.rxConsumers.push(consumer);
    }
    removeRxConsumer(consumer) {
        this.rxConsumers = this.rxConsumers.filter((i) => i !== consumer);
    }
    async call(method, args, stackTrace) {
        try {
            return await this.send({
                type: 'rpcCall',
                method,
                args,
                stackTrace,
            });
        }
        catch (e) {
            throw e;
        }
    }
    as() {
        return new Proxy(this, {
            get: (target, propKey, receiver) => {
                return (...args) => {
                    return this.call(propKey, args, stackTrace_1.filterFiles(Error().stack));
                };
            }
        });
    }
    setWorker(worker) {
        let wasAlreadySet = !!this.attachedWorker;
        if (worker) {
            this.attachedWorker = worker;
            this.attachedWorker.removeAllListeners('message');
            this.attachedWorker.addListener('message', this.handleIncommingMessage);
        }
        this.emit(exports.EVENT_WORKER_CHANGED, wasAlreadySet);
    }
}
exports.TransferIPCLayer = TransferIPCLayer;
TransferIPCLayer.IPC_MESSAGE_HEADER = '__transferLayerInternalMessage';
//# sourceMappingURL=TransferIPCLayer.js.map