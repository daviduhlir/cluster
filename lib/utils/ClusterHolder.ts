import * as cluster from 'cluster'
import { EventEmitter } from 'events'

export const CLUSTER_CHANGED = 'CLUSTER_CHANGED'

export class ClusterHolder {
    protected static workersArray: cluster.Worker[] = []
    public static readonly emitter: EventEmitter = new EventEmitter()

    public static fork(env?: any): cluster.Worker {
        const fork = cluster.fork(env)
        ClusterHolder.onChange()
        fork.on('exit', ClusterHolder.onChange)
        return fork
    }

    public static get workers(): cluster.Worker[] {
        return this.workersArray
    }

    public static get isMaster(): boolean {
        return cluster.isMaster
    }

    protected static onChange() {
        const newWorkers = ClusterHolder.workersArray = Object.keys(cluster.workers).reduce((acc, i) => ([...acc, cluster.workers[i]]), [])
        const event = {
            oldWorkers: [...ClusterHolder.workers],
            newWorkers,
        }
        ClusterHolder.emitter.emit(CLUSTER_CHANGED, event)
    }
}
