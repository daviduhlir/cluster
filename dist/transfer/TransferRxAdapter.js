"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const erors_1 = require("../utils/erors");
const stackTrace_1 = require("../utils/stackTrace");
class TransferRxAdapter {
    constructor(receiver, transferLayer) {
        this.receiver = receiver;
        this.transferLayer = transferLayer;
        this.clusterHandleMessage = async (message) => {
            if (message.type === 'rpcCall' && message.args && message.method) {
                if (!this.receiver) {
                    throw new Error('Receiver is not set');
                }
                if (message.method === 'ping') {
                    return;
                }
                if (!this.receiver[message.method]) {
                    const file = stackTrace_1.extractFilename(Error().stack);
                    throw new erors_1.TrasferedError(new erors_1.MethodNotFound(`Method ${message.method} was not found on receiver.`), [file]);
                }
                try {
                    return await this.receiver[message.method].apply(this.receiver, message.args);
                }
                catch (e) {
                    const file = stackTrace_1.extractFilename(Error().stack);
                    throw new erors_1.TrasferedError(e, [file]);
                }
            }
        };
        this.transferLayer.addRxConsumer(this.clusterHandleMessage);
    }
    destroy() {
        this.transferLayer.removeRxConsumer(this.clusterHandleMessage);
    }
}
exports.TransferRxAdapter = TransferRxAdapter;
//# sourceMappingURL=TransferRxAdapter.js.map