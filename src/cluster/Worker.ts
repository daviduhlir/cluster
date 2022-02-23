import * as cluster from 'cluster';
import { ForkConfig, TransferForkLayer } from './TransferForkLayer';
import { AsObject, EVENT_WORKER_CHANGED, TransferIPCLayer } from './TransferIPCLayer';
import { v1 as uuidv1 } from 'uuid';
import { TransferRxAdapter } from './TransferRxAdapter';

export const SUCCESS_INIT_FLAG = 'SUCCESS_INIT_FLAG';

export interface ForkInitializator {
    initialize: (id: string) => Promise<void>
}

export class Worker<TParams = any, TWorker = any> {
    protected id: string;
    protected forkHandler: TransferForkLayer;
    protected masterHandler: TransferIPCLayer;
    protected TransferRxAdapter: TransferRxAdapter;

    constructor(public readonly params: TParams, public readonly forkHandlerConfig?: ForkConfig) {
        this.init();
    }

    /**
     * Initialize worker layers
     */
    private async init() {
        if (cluster.isMaster) {
            // generate id for pair with fork
            this.id = uuidv1();
            this.forkHandler = new TransferForkLayer({ _fork_id: this.id }, this.forkHandlerConfig);
            this.TransferRxAdapter = new TransferRxAdapter(this, this.forkHandler);
            this.callInitializeWorkerFork();

            // if worker is changed, call init again
            this.forkHandler.addListener(EVENT_WORKER_CHANGED, this.callInitializeWorkerFork)
        } else {
            this.masterHandler = new TransferIPCLayer(process);
            // init rx adapter
            this.TransferRxAdapter = new TransferRxAdapter({
                initWorker: async (id: string, params: TParams) => {
                    if (id === process.env._fork_id) {
                        // reinit TransferRxAdapter
                        this.TransferRxAdapter.destroy();
                        // create adapter to only receive initWorker on this fork
                        this.TransferRxAdapter = new TransferRxAdapter(
                            await this.initWorker(params, this.masterHandler.as<any>()),
                            this.masterHandler,
                        );
                        return SUCCESS_INIT_FLAG;
                    }
                },
            }, this.masterHandler);
        }
    }

    /**
     *
     * @param wasAlreadySet
     */
    private callInitializeWorkerFork = async (wasAlreadySet?: true) => {
        if (wasAlreadySet) {
            this.workerUnmounted();
        }

        // send init worker
        if ((await this.forkHandler.as<any>().initWorker(this.id, this.params)) !== SUCCESS_INIT_FLAG) {
            throw new Error('Worker not found in any cluster.')
        }

        this.workerMounted();
    }

    /**
     * Get fork handler
     */
    public get fork() {
        if (cluster.isMaster) {
            return this.forkHandler.as<TWorker>();
        }
        return null;
    }

    /**
     * Get fork handler
     */
    public get worker(): cluster.Worker {
        if (cluster.isMaster) {
            return this.forkHandler.worker as any;
        }
        return null;
    }

    /**
     * Main worker method, override this to make your worker
     */
    protected async initWorker<T>(params: TParams, master: AsObject<T>): Promise<TWorker> {
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
