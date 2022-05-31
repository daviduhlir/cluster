"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPCReceiverLayer_1 = require("../RPC/RPCReceiverLayer");
const cluster = require("cluster");
const ForkHandler_1 = require("./ForkHandler");
class Cluster {
    constructor(initializators) {
        this.initializators = initializators;
        this.runningHandlers = {};
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
    static Initialize(initializators) {
        if (Cluster.alreadyInitialized) {
            throw new Error(`Cluster can be initialized only once.`);
        }
        Cluster.alreadyInitialized = true;
        return new Cluster(initializators);
    }
    get run() {
        if (cluster.isMaster) {
            return new Proxy(this, {
                get: (target, name, receiver) => async (...args) => this.startFork(name.toString(), args),
            });
        }
        else {
            throw new Error('Starting of forks outside of master process is not allowed');
        }
    }
    getRunningForks(name) {
        return this.runningHandlers[name] || [];
    }
    removeRunningFork(fork) {
        this.runningHandlers[fork.name] = (this.runningHandlers[fork.name] || []).filter(i => i !== fork);
    }
    async startFork(name, args) {
        const fork = new ForkHandler_1.ForkHandler(name, args);
        await fork.init();
        this.runningHandlers[name] = [...(this.runningHandlers[name] || []), fork];
        fork.addListener(ForkHandler_1.WORKER_DIED, this.removeRunningFork);
        return fork;
    }
}
exports.Cluster = Cluster;
Cluster.alreadyInitialized = false;
//# sourceMappingURL=Cluster.js.map