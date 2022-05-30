"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPCTransmitLayer_1 = require("../RPC/RPCTransmitLayer");
const RPCReceiverLayer_1 = require("../RPC/RPCReceiverLayer");
const cluster = require("cluster");
class MasterHandler {
    constructor(handlers) {
        this.handlers = handlers;
        this.receiverLayer = null;
        this.transmitLayer = null;
        if (cluster.isMaster) {
            this.receiverLayer = new RPCReceiverLayer_1.RPCReceiverLayer(handlers);
        }
        else {
            this.transmitLayer = new RPCTransmitLayer_1.RPCTransmitLayer(process);
        }
    }
    get call() {
        if (!cluster.isMaster) {
            return this.transmitLayer.as();
        }
        return null;
    }
}
exports.MasterHandler = MasterHandler;
//# sourceMappingURL=MasterHandler.js.map