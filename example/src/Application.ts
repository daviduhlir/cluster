import { Cluster } from '@david.uhlir/cluster'
import { Worker } from './Workers/Worker'

/**
 * Defined cluster
 */
Cluster.ipcMessageSizeLimit = 10 * 1024 * 1024 // 10MB
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
    const handler1 = await workers.run.main('test1')
    const handler2 = await workers.run.main('test2')
    await handler1.tx.test()
    await handler2.tx.test()
  }

  /**
   * Some test method can be called by RPC
   */
  public async pong() {
    console.log('hello world received on master')
  }

  /**
   * Simple proxy method, that will allows you to send message from worker to worker
   *
   * It's not used in this example, but it's there to see, how this things should works
   */
  public async proxy(target: string, method: string, args: any[]) {
    const forks = workers.getRunningForks(target)
    return Promise.all(forks.map(i => i.call[method](...args)))
  }
}
