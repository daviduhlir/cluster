import { Cluster, WORKER_INITIALIZED } from '@david.uhlir/cluster'
import { Worker } from './Workers/Worker'

/**
 * Defined cluster
 */
export const workers = Cluster.Initialize({
    main: async (name: string) => new Worker(name),
})

/**
 * Master application
 */
export class ApplicationMaster {
    constructor() {
        this.initialize()
    }

    /**
     * Initialize workers
     */
    protected async initialize() {
        const handle1 = await workers.run.main('test1')

        await handle1.call.test()
        handle1.on(WORKER_INITIALIZED, () => handle1.call.test())

        setTimeout(async () => {
            console.log('Calling freeze')
            try {
                await handle1.call.freeze()
            } catch(e) {}
        }, 1000)
    }

    /**
     * Some test method can be called by RPC
     */
    public async pong() {
        console.log('hello world received on master')
    }
}