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
    static Initialize(initializators) {
        if (MasterHandler.alreadyInitialized) {
            throw new Error(`Master handler can be initialized only once.`);
        }
        MasterHandler.alreadyInitialized = true;
        return new MasterHandler(initializators);
    }
    get call() {
        if (!cluster.isMaster) {
            return this.transmitLayer.as();
        }
        return null;
    }
}
exports.MasterHandler = MasterHandler;
MasterHandler.alreadyInitialized = false;
//# sourceMappingURL=MasterHandler.js.map