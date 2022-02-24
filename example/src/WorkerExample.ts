import { Worker, AsObject } from '@david.uhlir/cluster';

export interface Params {
    name: string;
}

/**
 * Fork process instance
 *
 * This class will represents worker in cluster.
 */
export class WorkerExampleFork {
    constructor(
        public readonly params: Params,
        public readonly master: AsObject<WorkerExample>,
    ) {
        // send ping to master
        master.ping();
    }

    // simple response to test communication between master and fork
    public pong() {
        return [this.params.name, Date.now()];
    }
}

/**
 * Master process instance
 *
 * This class will represents handler of fork in master process.
 */
export class WorkerExample extends Worker<Params, WorkerExampleFork> {
    constructor(params: Params) {
        super(params);
    }

    public async ping() {
        // send pong to my fork
        const result = await this.fork.pong();
        console.log('Ping result', result);
    }

    // worker was attached event
    public async workerMounted() {
        console.log('Worker was mounted');
    }

    // worker was dettached event
    public async workerUnmounted() {
        console.log('Worker was umounted');
    }

    // initialize my fork, return receiver object for RPC
    protected async initWorker(params: Params, master: any) {
        return new WorkerExampleFork(params, master);
    }
}
