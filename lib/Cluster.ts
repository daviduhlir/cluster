
import { RPCTransmitLayer, RPCReceiverLayer } from './RPCLayer'
import * as cluster from 'cluster';

export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
export type Await<T> = T extends PromiseLike<infer U> ? U : T
export type HandlersMap = {[name: string]: (...args: any[]) => Promise<any>}

export interface WorkerInitializatorhandler {
    INITIALIZE_WORKER: (name: string, args: any[]) => Promise<void>
}

/**
 * Fork handler for main worker to call fork functions
 */
export class ForkHandler<T> extends RPCTransmitLayer {
    protected forkId: string
    constructor(
        protected readonly name: string,
        protected readonly args: any[],
    ) {
        super(cluster.fork())
    }

    public async init() {
        return this.as<WorkerInitializatorhandler>().INITIALIZE_WORKER(this.name, this.args)
    }

    public get id(): string {
        return this.forkId
    }

    public get handler(): T {
        return this.as<T>()
    }
}

/**
 * Main cluster initializator
 */
export class Cluster<T extends HandlersMap, K extends HandlersMap = null> {
    protected initReceiverLayer: RPCReceiverLayer = null
    protected receiverLayer: RPCReceiverLayer = null
    protected transmitLayer: RPCTransmitLayer = null

    constructor(
        protected readonly initializators: T,
        protected readonly handlers: K,
    ) {
        if (!cluster.isMaster) {
            this.transmitLayer = new RPCTransmitLayer(process)
            this.initReceiverLayer = new RPCReceiverLayer({
                INITIALIZE_WORKER: this.initializeWorker,
            }, process)
        } else {
            this.receiverLayer = new RPCReceiverLayer(handlers)
        }
    }

    public get run(): {[K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ForkHandler<Await<ReturnType<T[K]>>>>} {
        if (cluster.isMaster) {
            return new Proxy(this as any, {
                get: (target, propKey, receiver) =>
                    async (...args) => {
                        const fork = new ForkHandler(propKey.toString(), args)
                        this.receiverLayer.attach(fork.process)
                        await fork.init()
                        return fork
                    }
            });
        } else {
            throw new Error('Starting of forks outside of master process is not allowed')
        }
    }

    public get call(): K {
        return this.transmitLayer.as<K>()
    }

    protected initializeWorker = async (name: string, args: any[]) => {
        if (this.initializators[name]) {
            this.receiverLayer = new RPCReceiverLayer(await this.initializators[name](...args), process)
            return
        }
        throw new Error(`Worker with name ${name} does not exists.`)
    }
}

