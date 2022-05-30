"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const utils_1 = require("../utils/utils");
const events_1 = require("events");
exports.PROCESS_CHANGED = 'PROCESS_CHANGED';
class RPCTransmitLayer extends events_1.EventEmitter {
    constructor(process) {
        super();
        if (process) {
            this.process = process;
        }
    }
    set process(process) {
        this.emit(exports.PROCESS_CHANGED, {
            oldProcess: this.processHandler,
            newProcess: process,
        });
        this.processHandler = process;
    }
    get process() {
        return this.processHandler;
    }
    as() {
        return new Proxy(this, {
            get: (target, propKey, receiver) => (...args) => this.callMethod(propKey.toString(), args),
        });
    }
    async callMethod(methodName, args) {
        if (!this.process) {
            throw new Error('Target process is not set.');
        }
        const hash = utils_1.randomHash();
        return new Promise((resolve, reject) => {
            const processDieHandler = () => {
                reject(new Error(`Process died, call of method ${methodName} was stopped.`));
                this.removeListener(exports.PROCESS_CHANGED, processDieHandler);
            };
            const messageHandler = message => {
                if (typeof message === 'object' &&
                    !Array.isArray(message) &&
                    message.hasOwnProperty('RPC_MESSAGE') &&
                    message.hasOwnProperty('CALL_METHOD') &&
                    message.RPC_MESSAGE === hash) {
                    this.process.removeListener('message', messageHandler);
                    this.removeListener(exports.PROCESS_CHANGED, processDieHandler);
                    if (message.error) {
                        reject(new Error(message.error));
                    }
                    else {
                        resolve(message.result);
                    }
                }
            };
            this.process.addListener('message', messageHandler);
            this.addListener(exports.PROCESS_CHANGED, processDieHandler);
            this.sendRaw({
                RPC_MESSAGE: hash,
                CALL_METHOD: methodName,
                WORKER: cluster.isMaster ? 'master' : cluster.worker.id,
                args,
            });
        });
    }
    sendRaw(message) {
        this.process.send({
            ...message,
        });
    }
}
exports.RPCTransmitLayer = RPCTransmitLayer;
//# sourceMappingURL=RPCTransmitLayer.js.map