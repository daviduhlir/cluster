"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cluster = void 0;
const ipc_method_1 = require("@david.uhlir/ipc-method");
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
                this.receiverLayer = new ipc_method_1.IpcMethodHandler(['cluster-fork-user'], await this.initializators[name](...args));
                return;
            }
            throw new Error(`Worker with name ${name} does not exists.`);
        };
        this.ping = async () => Date.now();
        if (cluster.isWorker) {
            this.systemReceiverLayer = new ipc_method_1.IpcMethodHandler(['cluster-internal'], {
                INITIALIZE_WORKER: this.initializeWorker,
                PING: this.ping,
            });
        }
    }
    static Initialize(initializators, forkConfig) {
        if (Cluster.alreadyInitialized) {
            throw new Error(`Cluster can be initialized only once.`);
        }
        Cluster.config = forkConfig || ForkHandler_1.forkDefaultConfig;
        Cluster.alreadyInitialized = true;
        return new Cluster(initializators);
    }
    restart() {
        Object.keys(this.runningHandlers).forEach(name => this.getRunningForks(name).forEach(fork => fork.restart()));
    }
    get run() {
        if (cluster.isMaster) {
            return new Proxy(this, {
                get: (target, name, receiver) => async (...args) => this.startFork(name.toString(), args, Cluster.config),
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
    async startFork(name, args, config) {
        const fork = new ForkHandler_1.ForkHandler(name, args, config);
        await fork.init();
        this.runningHandlers[name] = [...(this.runningHandlers[name] || []), fork];
        fork.addListener(ForkHandler_1.WORKER_DIED, this.removeRunningFork);
        return fork;
    }
}
exports.Cluster = Cluster;
Cluster.alreadyInitialized = false;
Cluster.config = ForkHandler_1.forkDefaultConfig;
//# sourceMappingURL=Cluster.js.map