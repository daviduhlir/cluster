"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const events_1 = require("events");
exports.CLUSTER_CHANGED = 'CLUSTER_CHANGED';
class ClusterHolder {
    static fork(env) {
        const fork = cluster.fork(env);
        ClusterHolder.onChange();
        fork.on('exit', ClusterHolder.onChange);
        return fork;
    }
    static get workers() {
        return this.workersArray;
    }
    static get isMaster() {
        return cluster.isMaster;
    }
    static onChange() {
        const newWorkers = ClusterHolder.workersArray = Object.keys(cluster.workers).reduce((acc, i) => ([...acc, cluster.workers[i]]), []);
        const event = {
            oldWorkers: [...ClusterHolder.workers],
            newWorkers,
        };
        ClusterHolder.emitter.emit(exports.CLUSTER_CHANGED, event);
    }
}
exports.ClusterHolder = ClusterHolder;
ClusterHolder.workersArray = [];
ClusterHolder.emitter = new events_1.EventEmitter();
//# sourceMappingURL=ClusterHolder.js.map