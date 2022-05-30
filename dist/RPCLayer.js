"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function randomHash() {
    return [...Array(10)]
        .map(x => 0)
        .map(() => Math.random().toString(36).slice(2))
        .join('');
}
class RPCTransmitLayer {
    constructor(process) {
        this.process = process;
    }
    async callMethod(methodName, args) {
        const hash = randomHash();
        return new Promise((resolve, reject) => {
            const messageHandler = (message) => {
                if (typeof message === 'object' && !Array.isArray(message) &&
                    message.hasOwnProperty('RPC_MESSAGE') &&
                    message.hasOwnProperty('CALL_METHOD') &&
                    message.RPC_MESSAGE === hash) {
                    this.process.removeListener('message', messageHandler);
                    if (message.error) {
                        reject(new Error(message.error));
                    }
                    else {
                        resolve(message.result);
                    }
                }
            };
            this.process.addListener('message', messageHandler);
            this.sendRaw({
                RPC_MESSAGE: hash,
                CALL_METHOD: methodName,
                args,
            });
        });
    }
    as() {
        return new Proxy(this, {
            get: (target, propKey, receiver) => (...args) => this.callMethod(propKey.toString(), args)
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