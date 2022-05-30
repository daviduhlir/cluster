"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPCReceiverLayer_1 = require("../RPC/RPCReceiverLayer");
const cluster = require("cluster");
const ForkHandler_1 = require("./ForkHandler");
class Cluster {
    constructor(initializators) {
        this.initializators = initializators;
        this.systemReceiverLayer = null;
        this.receiverLayer = null;
        this.initializeWorker = async (name, args) => {
            if (this.receiverLayer) {
                throw new Error('Worker was already initialized.');
            }
            if (this.initializators[name]) {
                this.receiverLayer = new RPCReceiverLayer_1.RPCReceiverLayer(await this.initializators[name](...args));
                return;
            }
            throw new Error(`Worker with name ${name} does not exists.`);
        };
        this.ping = async () => Date.now();
        if (!cluster.isMaster) {
            this.systemReceiverLayer = new RPCReceiverLayer_1.RPCReceiverLayer({
                INITIALIZE_WORKER: this.initializeWorker,
                PING: this.ping,
            });
        }
    }
    get run() {
        if (cluster.isMaster) {
            return new Proxy(this, {
                get: (target, propKey, receiver) => async (...args) => {
                    const fork = new ForkHandler_1.ForkHandler(propKey.toString(), args);
                    await fork.init();
                    return fork;
                },
            });
        }
        else {
            throw new Error('Starting of forks outside of master process is not allowed');
        }
    }
}
exports.Cluster = Cluster;
//# sourceMappingURL=Cluster.js.map