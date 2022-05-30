import * as cluster from 'cluster';
import { Cluster, MasterHandler } from '@david.uhlir/cluster'
import { WORKER_INITIALIZED } from '../../dist';

/**
 * USAGE
 */
const master = new MasterHandler({
    pong: async () => console.log('hello world received on master')
})

const workers = new Cluster({
    main: async (name: string) => {
        console.log('Initialize main ', name, process.pid)
        return {
            test: () => {
                console.log('Hello world from RPC', process.pid)
                setTimeout(() => master.call.pong(), 1000)
            },
            freeze: () => {
                while(true);
            }
        }
    },
})

if (cluster.isMaster) {
    (async function () {
        const handle1 = await workers.run.main('test1')

        await handle1.call.test()
        handle1.on(WORKER_INITIALIZED, () => handle1.call.test())

        setTimeout(async () => {
            console.log('Calling freeze')
            try {
                await handle1.call.freeze()
            } catch(e) {}
        }, 1000)
    })()
}
