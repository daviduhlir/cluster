import * as cluster from 'cluster';
import { Cluster } from '@david.uhlir/cluster'
import { WORKER_INITIALIZED } from '../../dist';

/**
 * USAGE
 */
const system = new Cluster({
    main: async (name: string) => {
        console.log('Initialize main ', name, process.pid)
        return {
            test: () => {
                console.log('Hello world from RPC', process.pid)
                // setTimeout(() => system.call.pong(), 1000)
            },
            freeze: () => {
                while(true);
            }
        }
    },
}, {
    pong: async () => console.log('hello world')
})

if (cluster.isMaster) {
    (async function () {
        const handle1 = await system.run.main('test1')
        handle1.on(WORKER_INITIALIZED, () => handle1.call.test())

        setTimeout(async () => {
            console.log('Calling freeze')
            try {
                await handle1.call.freeze()
            } catch(e) {}
        }, 1000)
    })()
}
