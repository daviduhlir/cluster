import * as cluster from 'cluster'
import { EventEmitter } from 'events'

export const CLUSTER_CHANGED = 'CLUSTER_CHANGED'

/**
 * Helper for keep all registred forks in one array.
 */
export class ClusterHolder {
    protected static workersArray: cluster.Worker[] = []
    public static readonly emitter: EventEmitter = new EventEmitter()

    /**
     * Fotk the application
     */
    public static fork(env?: any): cluster.Worker {
        const fork = cluster.fork(env)
        ClusterHolder.onChange()
        fork.on('exit', ClusterHolder.onChange)
        return fork
    }

    /**
     * Get all workers
     */
    public static get workers(): cluster.Worker[] {
        return this.workersArray
    }

    /**
     * Is current process is master
     */
    public static get isMaster(): boolean {
        return cluster.isMaster
    }

    /**
     * Handle number of forks change
     */
    protected static onChange() {
        const newWorkers = ClusterHolder.workersArray = Object.keys(cluster.workers).reduce((acc, i) => ([...acc, cluster.workers[i]]), [])
        const event = {
            oldWorkers: [...ClusterHolder.workers],
            newWorkers,
        }
        ClusterHolder.emitter.emit(CLUSTER_CHANGED, event)
    }
}
