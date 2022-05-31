"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPCTransmitLayer_1 = require("../RPC/RPCTransmitLayer");
const cluster = require("cluster");
const ClusterHolder_1 = require("../utils/ClusterHolder");
exports.WORKER_INITIALIZED = 'WORKER_INITIALIZED';
exports.WORKER_DIED = 'WORKER_DIED';
exports.WORKER_RESTARTED = 'WORKER_RESTARTED';
exports.forkDefaultConfig = {
    PING_INTERVAL: 5000,
    PING_MAX_TIME: 1000,
    PING_RESTART_ON_TIMEOUT: true,
};
class ForkHandler extends RPCTransmitLayer_1.RPCTransmitLayer {
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
        this.process = ClusterHolder_1.ClusterHolder.fork();
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
//# sourceMappingURL=ForkHandler.js.map