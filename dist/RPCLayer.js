"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
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
class RPCReceiverLayer {
    constructor(handlers, process = null) {
        this.handlers = handlers;
        this.process = process;
        this.attached = [];
        this.handleIncommingMessage = async (sender, message) => {
            if (message.RPC_MESSAGE && message.CALL_METHOD && this.handlers?.[message.CALL_METHOD]) {
                try {
                    const result = await this.handlers[message.CALL_METHOD](...message.args);
                    sender.send({
                        RPC_MESSAGE: message.RPC_MESSAGE,
                        CALL_METHOD: message.CALL_METHOD,
                        result,
                    });
                }
                catch (e) {
                    sender.send({
                        RPC_MESSAGE: message.RPC_MESSAGE,
                        CALL_METHOD: message.CALL_METHOD,
                        error: e.message,
                    });
                }
            }
        };
        if (this.process) {
            this.attach(this.process);
        }
    }
    attach(process) {
        const method = this.handleIncommingMessage.bind(this, process);
        this.attached.push([process, method]);
        process.addListener('message', method);
    }
    detach(process) {
        const t = this.attached.find(i => i[0] === process);
        if (t) {
            process.removeListener('message', t[1]);
            this.attached = this.attached.filter(i => i[0] !== process);
        }
    }
    destroy() {
        this.attached.forEach(i => {
            process.removeListener('message', i[1]);
        });
        this.attached = [];
    }
}
exports.RPCReceiverLayer = RPCReceiverLayer;
//# sourceMappingURL=RPCLayer.js.map