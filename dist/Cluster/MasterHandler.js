"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterHandler = void 0;
const ipc_method_1 = require("@david.uhlir/ipc-method");
const cluster = require("cluster");
class MasterHandler {
    constructor(receiverFactory) {
        this.receiverFactory = receiverFactory;
        this.methodHandler = null;
        this.receiverProxyWraper = null;
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
            this.methodHandler = new ipc_method_1.IpcMethodHandler(['cluster-master-user'], this.receiver || {});
            this.receiverProxyWraper = new Proxy({}, {
                get: (target, propKey, receiver) => async (...args) => this.receiver[propKey](...args),
            });
        }
        else {
            this.methodHandler = new ipc_method_1.IpcMethodHandler(['cluster-master-user']);
        }
    }
    get tx() {
        if (!cluster.isMaster) {
            return this.methodHandler.as();
        }
        return this.receiverProxyWraper;
    }
}
exports.MasterHandler = MasterHandler;
MasterHandler.createdInstance = null;
//# sourceMappingURL=MasterHandler.js.map