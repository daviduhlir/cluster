"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const ClusterHolder_1 = require("../utils/ClusterHolder");
class RPCReceiverLayer {
    constructor(receiver) {
        this.receiver = receiver;
        this.onClusterChange = ({ oldWorkers, newWorkers }) => {
            oldWorkers.forEach(w => w.removeListener('message', this.handleIncommingMessage));
            newWorkers.forEach(w => w.addListener('message', this.handleIncommingMessage));
        };
        this.handleIncommingMessage = async (message) => {
            if (message.RPC_MESSAGE &&
                message.CALL_METHOD &&
                typeof this.receiver[message.CALL_METHOD] === 'function') {
                const sender = message.WORKER === 'master' ? process : cluster.workers[message.WORKER];
                try {
                    const result = await this.receiver[message.CALL_METHOD](...message.args);
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