"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const uuid_1 = require("uuid");
class Worker {
    constructor(params = null, forkHandlerConfig) {
        this.params = params;
        this.forkHandlerConfig = forkHandlerConfig;
        this.init();
    }
    async init() {
        if (cluster.isMaster) {
            this.id = uuid_1.v4();
            this.forkHandler = cluster.fork({ _fork_id: this.id });
            console.log('Sending init', this.id);
            this.forkHandler.send({
                CLUSTER_INIT: this.id,
            });
        }
        else {
            process.addListener('message', async (message) => {
                if (message.CLUSTER_INIT === process.env._fork_id) {
                    this.workerReceiver = await this.initWorker();
                }
            });
        }
    }
    async initWorker() {
        return null;
    }
    async workerUnmounted() { }
    async workerMounted() { }
}
exports.Worker = Worker;
//# sourceMappingURL=Worker.js.map