"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPCLayer_1 = require("./RPCLayer");
const cluster = require("cluster");
class ForkHandler extends RPCLayer_1.RPCTransmitLayer {
    constructor(name, args) {
        super(cluster.fork());
        this.name = name;
        this.args = args;
    }
    async init() {
        return this.as().INITIALIZE_WORKER(this.name, this.args);
    }
    get id() {
        return this.forkId;
    }
    get handler() {
        return this.as();
    }
}
exports.ForkHandler = ForkHandler;
class Cluster {
    constructor(initializators, handlers) {
        this.initializators = initializators;
        this.handlers = handlers;
        this.initReceiverLayer = null;
        this.receiverLayer = null;
        this.transmitLayer = null;
        this.initializeWorker = async (name, args) => {
            if (this.initializators[name]) {
                this.receiverLayer = new RPCLayer_1.RPCReceiverLayer(await this.initializators[name](...args), process);
                return;
            }
            throw new Error(`Worker with name ${name} does not exists.`);
        };
        if (!cluster.isMaster) {
            this.transmitLayer = new RPCLayer_1.RPCTransmitLayer(process);
            this.initReceiverLayer = new RPCLayer_1.RPCReceiverLayer({
                INITIALIZE_WORKER: this.initializeWorker,
            }, process);
        }
        else {
            this.receiverLayer = new RPCLayer_1.RPCReceiverLayer(handlers);
        }
    }
    get run() {
        if (cluster.isMaster) {
            return new Proxy(this, {
                get: (target, propKey, receiver) => async (...args) => {
                    const fork = new ForkHandler(propKey.toString(), args);
                    this.receiverLayer.attach(fork.process);
                    await fork.init();
                    return fork;
                }
            });
        }
        else {
            throw new Error('Starting of forks outside of master process is not allowed');
        }
    }
    get call() {
        return this.transmitLayer.as();
    }
}
exports.Cluster = Cluster;
//# sourceMappingURL=Cluster.js.map