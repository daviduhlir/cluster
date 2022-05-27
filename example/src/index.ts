import * as cluster from 'cluster';
import { RPCTransmitLayer, RPCReceiverLayer } from './RPCLayer'

export type ArgumentTypes<T> = T extends (... args: infer U ) => infer R ? U: never;
class ForkHandler<T> extends RPCTransmitLayer {
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

class Cluster<T extends {[name: string]: (...args: any[]) => any}> {
    protected receiverLayer: RPCReceiverLayer = null

    constructor(protected readonly initializators: T) {
        if (!cluster.isMaster) {
            process.addListener('message', this.handleIncommingMessage)
        }
    }

    public get run(): {[K in keyof T]: (...args: ArgumentTypes<T[K]>) => ForkHandler<ReturnType<T[K]>>} {
        if (cluster.isMaster) {
            return new Proxy(this as any, {
                get: (target, propKey, receiver) =>
                    (...args) => new ForkHandler(propKey.toString(), args)
            });
        } else {
            throw new Error('Starting of forks outside of master process is not allowed')
        }
    }

    protected handleIncommingMessage = async (message) => {
        // init worker
        if (message.INITIALIZE_WORKER) {
            const name = message.INITIALIZE_WORKER
            if (this.initializators[name]) {
                this.receiverLayer = new RPCReceiverLayer(process, this.initializators[name](message.args))
            }
        }
    }
}


/**
 * USAGE
 */
const system = new Cluster({
    main1: () => {
        console.log('Initialize main 1', process.pid)
        return {
            test: () => console.log('Hello world from RPC', process.pid)
        }
    },
    main2: () => {
        console.log('Initialize main 2', process.pid)
    }
})

if (cluster.isMaster) {
    const handle1 = system.run.main1()

    handle1.handler.test()

    const handle2 = system.run.main1()

    handle2.handler.test()

    const handle3 = system.run.main2()
}
