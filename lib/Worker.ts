import * as cluster from 'cluster';
import { ForkConfig } from './transfer/TransferForkLayer';
import { v4 as uuid } from 'uuid';

export class Worker<TParams = any, TWorker = any> {
    protected id: string;
    protected forkHandler: cluster.Worker;
    protected workerReceiver: any;

    constructor(public readonly params: TParams = null, public readonly forkHandlerConfig?: ForkConfig) {
        this.init();
    }

    /**
     * Initialize worker layers
     */
    private async init() {
        if (cluster.isMaster) {
            // generate id for pair with fork
            this.id = uuid();

            this.forkHandler = cluster.fork({ _fork_id: this.id });

            console.log('Sending init', this.id)
            this.forkHandler.send({
                CLUSTER_INIT: this.id,
            })

        } else {
            process.addListener('message', async (message) => {
                if (message.CLUSTER_INIT === process.env._fork_id) {
                    this.workerReceiver = await this.initWorker()
                }
            });
        }
    }

    /**
     * Main worker method, override this to make your worker
     */
    protected async initWorker(): Promise<TWorker> {
        return null;
    }

    /**
     * Worker was initialized
     */
    protected async workerUnmounted() {}

    /**
     * Worker was initialized
     */
    protected async workerMounted() {}
}
