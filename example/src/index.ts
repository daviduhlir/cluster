import * as cluster from 'cluster';
import { Cluster } from '@david.uhlir/cluster'

/**
 * USAGE
 */
const system = new Cluster({
    main1: async (name: string) => {
        console.log('Initialize main ', name, process.pid)
        return {
            test: () => {
                console.log('Hello world from RPC', process.pid)
                setTimeout(() => system.call.pong(), 1000)
            }
        }
    },
    main2: async () => {
        console.log('Initialize main 2', process.pid)
    }
}, {
    pong: async () => console.log('hello world')
})

if (cluster.isMaster) {
    (async function () {
        const handle1 = await system.run.main1('test1')
        handle1.handler.test()

        const handle2 = await system.run.main1('test2')
        handle2.handler.test()

        const handle3 = await  system.run.main2()
    })()
}
