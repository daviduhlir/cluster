"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const ClusterHolder_1 = require("../utils/ClusterHolder");
class RPCReceiverLayer {
    constructor(handlers) {
        this.handlers = handlers;
        this.onClusterChange = ({ oldWorkers, newWorkers }) => {
            oldWorkers.forEach(w => w.removeListener('message', this.handleIncommingMessage));
            newWorkers.forEach(w => w.addListener('message', this.handleIncommingMessage));
        };
        this.handleIncommingMessage = async (message) => {
            if (message.RPC_MESSAGE && message.CALL_METHOD && this.handlers?.[message.CALL_METHOD]) {
                const sender = message.WORKER === 'master' ? process : cluster.workers[message.WORKER];
                try {
                    const result = await this.handlers[message.CALL_METHOD](...message.args);
                    sender.send({
                        RPC_MESSAGE: message.RPC_MESSAGE,
                        CALL_METHOD: message.CALL_METHOD,
                        result,
                    });
                }
                catch (e) {
                    sender.send({
                        RPC_MESSAGE: message.RPC_MESSAGE,
                        CALL_METHOD: message.CALL_METHOD,
                        error: e.message,
                    });
                }
            }
        };
        if (cluster.isMaster) {
            ClusterHolder_1.ClusterHolder.emitter.on(ClusterHolder_1.CLUSTER_CHANGED, this.onClusterChange);
        }
        else {
            process.addListener('message', this.handleIncommingMessage);
        }
    }
}
exports.RPCReceiverLayer = RPCReceiverLayer;
//# sourceMappingURL=RPCReceiverLayer.js.map