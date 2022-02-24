"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const TransferForkLayer_1 = require("./transfer/TransferForkLayer");
const TransferIPCLayer_1 = require("./transfer/TransferIPCLayer");
const uuid_1 = require("uuid");
const TransferRxAdapter_1 = require("./transfer/TransferRxAdapter");
exports.SUCCESS_INIT_FLAG = 'SUCCESS_INIT_FLAG';
class Worker {
    constructor(params, forkHandlerConfig) {
        this.params = params;
        this.forkHandlerConfig = forkHandlerConfig;
        this.callInitializeWorkerFork = async (wasAlreadySet) => {
            if (wasAlreadySet) {
                this.workerUnmounted();
            }
            if ((await this.forkHandler.as().initWorker(this.id, this.params)) !== exports.SUCCESS_INIT_FLAG) {
                throw new Error('Worker not found in any cluster.');
            }
            this.workerMounted();
        };
        this.init();
    }
    async init() {
        if (cluster.isMaster) {
            this.id = uuid_1.v1();
            this.forkHandler = new TransferForkLayer_1.TransferForkLayer({ _fork_id: this.id }, this.forkHandlerConfig);
            this.TransferRxAdapter = new TransferRxAdapter_1.TransferRxAdapter(this, this.forkHandler);
            this.callInitializeWorkerFork();
            this.forkHandler.addListener(TransferIPCLayer_1.EVENT_WORKER_CHANGED, this.callInitializeWorkerFork);
        }
        else {
            this.masterHandler = new TransferIPCLayer_1.TransferIPCLayer(process);
            this.TransferRxAdapter = new TransferRxAdapter_1.TransferRxAdapter({
                initWorker: async (id, params) => {
                    if (id === process.env._fork_id) {
                        this.TransferRxAdapter.destroy();
                        this.TransferRxAdapter = new TransferRxAdapter_1.TransferRxAdapter(await this.initWorker(params, this.masterHandler.as()), this.masterHandler);
                        return exports.SUCCESS_INIT_FLAG;
                    }
                },
            }, this.masterHandler);
        }
    }
    get fork() {
        if (cluster.isMaster) {
            return this.forkHandler.as();
        }
        return null;
    }
    get worker() {
        if (cluster.isMaster) {
            return this.forkHandler.worker;
        }
        return null;
    }
    async initWorker(params, master) {
        return null;
    }
    async workerUnmounted() { }
    async workerMounted() { }
}
exports.Worker = Worker;
//# sourceMappingURL=Worker.js.map