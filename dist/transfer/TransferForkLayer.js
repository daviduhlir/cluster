"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const TransferIPCLayer_1 = require("./TransferIPCLayer");
exports.forkDefaultConfig = {
    PING_INTERVAL: 5000,
    PING_MAX_TIME: 1000,
};
class TransferForkLayer extends TransferIPCLayer_1.TransferIPCLayer {
    constructor(args = {}, config = exports.forkDefaultConfig) {
        super(cluster.fork(args));
        this.args = args;
        this.config = config;
        this.living = true;
        this.pingInterval = null;
        if (!cluster.isMaster) {
            throw new Error('Local fork handler can be created only from master process');
        }
        this.resetPing();
    }
    stop() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        this.living = false;
        this.worker?.process.kill('SIGKILL');
        this.setWorker(null);
    }
    restart() {
        console.log(`Fork force restart`);
        this.worker?.process.kill('SIGKILL');
        this.setWorker(null);
    }
    ping() {
        if (this.living) {
            const killTimeout = setTimeout(() => {
                console.warn(`Fork not responding to ping.`);
                this.restart();
            }, this.config.PING_MAX_TIME);
            this.as().ping()
                .then(() => {
                clearTimeout(killTimeout);
            }, () => {
                console.warn(`Fork ping failed.`);
                clearTimeout(killTimeout);
                this.restart();
            });
        }
    }
    resetPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.config.PING_INTERVAL) {
            this.pingInterval = setInterval(() => this.ping(), this.config.PING_INTERVAL);
        }
    }
    setWorker(worker) {
        super.setWorker(worker);
        if (worker) {
            worker.on('exit', (code, signal) => {
                if (this.living) {
                    console.error(`Fork died with code ${code}, will be restarted`);
                    this.setWorker(cluster.fork(this.args));
                    this.resetPing();
                }
                else {
                    console.error(`Fork died with code ${code}.`);
                }
            });
        }
    }
}
exports.TransferForkLayer = TransferForkLayer;
//# sourceMappingURL=TransferForkLayer.js.map