import { AsObject } from './cluster/TransferIPCLayer';
import { Worker } from './cluster/Worker';

export interface Params {
    name: string;
}

// fork class
export class WorkerExampleFork {
    constructor(
        public readonly params: Params,
        public readonly master: AsObject<WorkerExample>,
    ) {
        master.sayHello();
    }

    public pong() {
        return [this.params.name, Date.now()];
    }
}

// master worker
export class WorkerExample extends Worker<Params, WorkerExampleFork> {
    constructor(params: Params) {
        super(params);
    }

    public async sayHello() {
        console.log(await this.fork.pong());
    }

    protected async initWorker(params: Params, master: any) {
        return new WorkerExampleFork(params, master);
    }
}
