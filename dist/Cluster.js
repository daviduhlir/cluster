"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPCLayer_1 = require("./RPCLayer");
const cluster = require("cluster");
exports.WORKER_INITIALIZED = 'WORKER_INITIALIZED';
exports.forkDefaultConfig = {
    PING_INTERVAL: 5000,
    PING_MAX_TIME: 1000,
    PING_RESTART_ON_TIMEOUT: true,
};
class ForkHandler extends RPCLayer_1.RPCTransmitLayer {
    constructor(name, args, config = exports.forkDefaultConfig) {
        super();
        this.name = name;
        this.args = args;
        this.config = config;
        this.isLiving = true;
        this.pingInterval = null;
        this.handleStop = async (code, signal) => {
            if (this.isLiving) {
                console.error(`CLUSTER [${this.name} ${process.pid}] Fork died with code ${signal}, will be restarted`);
                this.fork();
                await this.init();
            }
            else {
                console.error(`CLUSTER [${this.name} ${process.pid}] Fork died with code ${signal}.`);
            }
        };
        this.fork();
    }
    async init() {
        if (cluster.isMaster) {
            if (!this.isLiving) {
                throw new Error(`You can't call init on worker, that is no longer living.`);
            }
            await this.as().INITIALIZE_WORKER(this.name, this.args);
            setImmediate(() => this.emit(exports.WORKER_INITIALIZED));
            return;
        }
        throw new Error('Calling of init outside of master process is not allowed');
    }
    get call() {
        if (!this.isLiving) {
            throw new Error(`You can't call methods on worker, that is no longer living.`);
        }
        return this.as();
    }
    kill() {
        if (!this.isLiving) {
            throw new Error(`You can't kill worker, that is no longer living.`);
        }
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        console.log(`CLUSTER [${this.name} ${process.pid}] Call fork force kill`);
        this.isLiving = false;
        this.process.process.kill('SIGKILL');
        this.stopPing();
    }
    restart() {
        if (!this.isLiving) {
            throw new Error(`You can't restart worker, that is no longer living.`);
        }
        console.log(`CLUSTER [${this.name} ${process.pid}] Call fork force restart`);
        this.process.process.kill('SIGKILL');
        this.stopPing();
    }
    fork() {
        if (this.process) {
            this.process.removeListener('exit', this.handleStop);
        }
        this.process = cluster.fork();
        this.resetPing();
        this.process.addListener('exit', this.handleStop);
    }
    resetPing() {
        this.stopPing();
        if (this.config.PING_INTERVAL && this.process && this.isLiving) {
            this.pingInterval = setInterval(() => this.ping(), this.config.PING_INTERVAL);
        }
    }
    stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    async ping() {
        if (this.isLiving) {
            const killTimeout = setTimeout(() => {
                console.warn(`CLUSTER [${this.name} ${process.pid}] Fork not responding to ping`);
                if (this.config.PING_RESTART_ON_TIMEOUT) {
                    this.restart();
                }
                else {
                    this.kill();
                }
            }, this.config.PING_MAX_TIME);
            try {
                await this.as().PING();
            }
            catch (e) { }
            clearTimeout(killTimeout);
        }
    }
}
exports.ForkHandler = ForkHandler;
class Cluster {
    constructor(initializators, handlers) {
        this.initializators = initializators;
        this.handlers = handlers;
        this.systemReceiverLayer = null;
        this.receiverLayer = null;
        this.transmitLayer = null;
        this.initializeWorker = async (name, args) => {
            if (this.receiverLayer) {
                throw new Error('Worker was already initialized.');
            }
            if (this.initializators[name]) {
                this.receiverLayer = new RPCLayer_1.RPCReceiverLayer(await this.initializators[name](...args), process);
                return;
            }
            throw new Error(`Worker with name ${name} does not exists.`);
        };
        this.ping = async () => Date.now();
        if (!cluster.isMaster) {
            this.transmitLayer = new RPCLayer_1.RPCTransmitLayer(process);
            this.systemReceiverLayer = new RPCLayer_1.RPCReceiverLayer({
                INITIALIZE_WORKER: this.initializeWorker,
                PING: this.ping,
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
                    fork.addListener(RPCLayer_1.PROCESS_CHANGED, ({ oldProcess, newProcess }) => {
                        if (oldProcess) {
                            this.receiverLayer.detach(oldProcess);
                        }
                        if (newProcess) {
                            this.receiverLayer.attach(oldProcess);
                        }
                    });
                    await fork.init();
                    return fork;
                },
            });
        }
        else {
            throw new Error('Starting of forks outside of master process is not allowed');
        }
    }
    get call() {
        if (!cluster.isMaster) {
            return this.transmitLayer.as();
        }
        return null;
    }
}
exports.Cluster = Cluster;
//# sourceMappingURL=Cluster.js.map