"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const ClusterHolder_1 = require("../utils/ClusterHolder");
const utils_1 = require("../utils/utils");
class RPCReceiverLayer {
    constructor(receiver) {
        this.receiver = receiver;
        if (!RPCReceiverLayer.attached) {
            if (cluster.isMaster) {
                ClusterHolder_1.ClusterHolder.emitter.on(ClusterHolder_1.CLUSTER_CHANGED, RPCReceiverLayer.onClusterChange);
            }
            else {
                process.addListener('message', RPCReceiverLayer.handleIncommingMessage);
            }
            RPCReceiverLayer.attached = true;
        }
        this.receiverHash = utils_1.randomHash();
        RPCReceiverLayer.receivers[this.receiverHash] = this;
    }
    destroy() {
        delete RPCReceiverLayer.receivers[this.receiverHash];
    }
    hasMethod(name) {
        return typeof this.receiver[name] === 'function';
    }
    async callMethod(name, args) {
        return this.receiver[name](...args);
    }
    static onClusterChange({ oldWorkers, newWorkers }) {
        oldWorkers.forEach(w => w.removeListener('message', RPCReceiverLayer.handleIncommingMessage));
        newWorkers.forEach(w => w.addListener('message', RPCReceiverLayer.handleIncommingMessage));
    }
    static getReceivers() {
        return Object.keys(RPCReceiverLayer.receivers).reduce((acc, i) => ([...acc, RPCReceiverLayer.receivers[i]]), []);
    }
    static async handleIncommingMessage(message) {
        if (message.RPC_MESSAGE &&
            message.CALL_METHOD &&
            (typeof message.WORKER === 'number' || message.WORKER === 'master')) {
            const sender = message.WORKER === 'master' ? process : cluster.workers[message.WORKER];
            const results = await Promise.all(RPCReceiverLayer.getReceivers()
                .filter(receiver => receiver.hasMethod(message.CALL_METHOD))
                .map(receiver => {
                return receiver.callMethod(message.CALL_METHOD, message.args)
                    .then(result => ({
                    CALL_STATUS: 'METHOD_CALL_SUCCESS',
                    result
                }), error => ({
                    CALL_STATUS: 'METHOD_CALL_ERROR',
                    error
                }));
            }));
            if (results.length === 0) {
                sender.send({
                    RPC_MESSAGE: message.RPC_MESSAGE,
                    CALL_METHOD: message.CALL_METHOD,
                    error: 'METHOD_NOT_FOUND',
                });
                return;
            }
            sender.send({
                RPC_MESSAGE: message.RPC_MESSAGE,
                CALL_METHOD: message.CALL_METHOD,
                results,
            });
        }
    }
}
exports.RPCReceiverLayer = RPCReceiverLayer;
RPCReceiverLayer.receivers = {};
RPCReceiverLayer.attached = false;
//# sourceMappingURL=RPCReceiverLayer.js.map