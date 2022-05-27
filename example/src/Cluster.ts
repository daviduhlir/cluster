
import { RPCTransmitLayer, RPCReceiverLayer } from './RPCLayer'
import * as cluster from 'cluster';

export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
export class ForkHandler<T> extends RPCTransmitLayer {
    protected forkId: string
    constructor(
        protected readonly name: string,
        protected readonly args: any[],
    ) {
        super(cluster.fork())

        this.sendRaw({
            INITIALIZE_WORKER: name,
            args,
        })
    }

    public get id(): string {
        return this.forkId
    }

    public get handler(): T {
        return this.as<T>()
    }
}

export class Cluster<T extends {[name: string]: (...args: any[]) => any}, K extends {[name: string]: (...args: any[]) => Promise<any>} = null> {
    protected receiverLayer: RPCReceiverLayer = null
    protected transmitLayer: RPCTransmitLayer = null

    constructor(
        protected readonly initializators: T,
        protected readonly handlers: K,
    ) {
        if (!cluster.isMaster) {
            process.addListener('message', this.handleIncommingMessage)
            this.transmitLayer = new RPCTransmitLayer(process)
        } else {
            this.receiverLayer = new RPCReceiverLayer(handlers)
        }
    }

    public get run(): {[K in keyof T]: (...args: ArgumentTypes<T[K]>) => ForkHandler<ReturnType<T[K]>>} {
        if (cluster.isMaster) {
            return new Proxy(this as any, {
                get: (target, propKey, receiver) =>
                    (...args) => {
                        const fork = new ForkHandler(propKey.toString(), args)
                        this.receiverLayer.attach(fork.process)
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

    protected handleIncommingMessage = async (message) => {
        // init worker
        if (message.INITIALIZE_WORKER) {
            const name = message.INITIALIZE_WORKER
            if (this.initializators[name]) {
                this.receiverLayer = new RPCReceiverLayer(this.initializators[name](...message.args), process)
            }
        }
    }
}

