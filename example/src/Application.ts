import { Cluster, ForkHandler, WORKER_INITIALIZED } from '@david.uhlir/cluster'
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
  protected handlers: {[name: string]: ForkHandler<any>} = {}
  constructor() {
    this.initialize()
  }

  /**
   * Initialize workers
   */
  protected async initialize() {
    this.handlers = {
      main1: await workers.run.main('test1'),
      main2: await workers.run.main('test2'),
    }

    await this.handlers.main1.call.test()

    // freeze test
    /*setTimeout(async () => {
      console.log('Calling freeze')
      try {
        await this.handlers.main1.call.freeze()
      } catch (e) {}
    }, 1000)*/
  }

  /**
   * Some test method can be called by RPC
   */
  public async pong() {
    console.log('hello world received on master')
  }

  /**
   * Simple proxy method, that will allows you to send message from worker to worker
   */
  public async proxy(target: string, method: string, args: any[]) {
    const forks = workers.getRunningForks(target)
    return Promise.all(forks.map(i => i.call[method](...args)))
  }
}
