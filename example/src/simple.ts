import { Cluster, MasterHandler } from '@david.uhlir/cluster'

const workers = Cluster.Initialize({
  worker: async () => ({
    sayHello: async () => console.log('Hello world PID:', process.pid)
  }),
})

MasterHandler.Initialize(async () => {
  console.log('Initialize PID:', process.pid)
  const handler = await workers.run.worker()
  await handler.tx.sayHello()
})


setTimeout(() => workers.restart(), 2000)