# Cluster util for node.js

This utility is for handle run forks of application with specific initializators.
It also provides method calling between fork and master provided as promises.

This util is also checking all forks by ping to know their health. If the response is too long
it will restart/kill them - depends on configuration

## Usage

```ts
import { Cluster, MasterHandler } from '@david.uhlir/cluster'

const workers = Cluster.Initialize({
  worker: async () => ({
    sayHello: () => console.log('Hello world PID:', process.pid)
  }),
})

MasterHandler.Initialize(async () => {
  console.log('Initialize PID:', process.pid)
  const handler = await workers.run.worker()
  await handler.call.sayHello()
})

```

ISC