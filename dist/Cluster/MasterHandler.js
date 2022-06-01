"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPCTransmitLayer_1 = require("../RPC/RPCTransmitLayer");
const RPCReceiverLayer_1 = require("../RPC/RPCReceiverLayer");
const cluster = require("cluster");
class MasterHandler {
    constructor(receiverFactory) {
        this.receiverFactory = receiverFactory;
        this.receiverLayer = null;
        this.transmitLayer = null;
        this.initialize();
    }
    static Initialize(receiverFactory) {
        if (MasterHandler.createdInstance) {
            throw new Error(`Master handler can be initialized only once.`);
        }
        MasterHandler.createdInstance = new MasterHandler(receiverFactory);
        return MasterHandler.createdInstance;
    }
    static getInstance() {
        return MasterHandler.createdInstance;
    }
    async initialize() {
        if (cluster.isMaster) {
            this.receiver = await this.receiverFactory();
            this.receiverLayer = new RPCReceiverLayer_1.RPCReceiverLayer(this.receiver || {});
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
MasterHandler.createdInstance = null;
//# sourceMappingURL=MasterHandler.js.map