"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForkHandler = exports.forkDefaultConfig = exports.PROCESS_CHANGED = exports.WORKER_RESTARTED = exports.WORKER_DIED = exports.WORKER_INITIALIZED = void 0;
const ipc_method_1 = require("@david.uhlir/ipc-method");
const cluster = require("cluster");
exports.WORKER_INITIALIZED = 'WORKER_INITIALIZED';
exports.WORKER_DIED = 'WORKER_DIED';
exports.WORKER_RESTARTED = 'WORKER_RESTARTED';
exports.PROCESS_CHANGED = 'PROCESS_CHANGED';
exports.forkDefaultConfig = {
    PING_INTERVAL: 5000,
    PING_MAX_TIME: 1000,
    PING_RESTART_ON_TIMEOUT: true,
};
class ForkHandler extends ipc_method_1.IpcMethodHandler {
    constructor(name, args, config = exports.forkDefaultConfig) {
        super(['cluster-fork-user']);
        this.name = name;
        this.args = args;
        this.config = config;
        this.isLiving = true;
        this.pingInterval = null;
        this.internalIpcTx = new ipc_method_1.IpcMethodHandler(['cluster-internal']);
        this.handleStop = async (code, signal) => {
            if (this.isLiving) {
                console.error(`CLUSTER [${this.name} ${process.pid}] Fork died with code ${signal}, will be restarted`);
                this.fork();
                await this.init();
                this.emit(exports.WORKER_RESTARTED, this);
            }
            else {
                this.emit(exports.WORKER_DIED, this);
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
            await this.internalIpcTx.as([this.process]).INITIALIZE_WORKER(this.name, this.args);
            setImmediate(() => this.emit(exports.WORKER_INITIALIZED));
            return;
        }
        throw new Error('Calling of init outside of master process is not allowed');
    }
    get tx() {
        if (!this.isLiving) {
            throw new Error(`You can't call methods on worker, that is no longer living.`);
        }
        return this.as([this.process]);
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
    set process(process) {
        this.emit(exports.PROCESS_CHANGED, {
            oldProcess: this.processHandler,
            newProcess: process,
        });
        this.processHandler = process;
    }
    get process() {
        return this.processHandler;
    }
    get processes() {
        if (cluster.isWorker) {
            throw new Error('Fork handler is designed only for master process.');
        }
        else {
            return [this.processHandler];
        }
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
                await this.internalIpcTx.as([this.process]).PING();
            }
            catch (e) { }
            clearTimeout(killTimeout);
        }
    }
}
exports.ForkHandler = ForkHandler;
//# sourceMappingURL=ForkHandler.js.map