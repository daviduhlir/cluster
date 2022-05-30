import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer'
import * as cluster from 'cluster'
import { HandlersMap, ArgumentTypes, Await } from '../utils/types'
import { ForkHandler } from './ForkHandler'

/**
 * Main cluster initializator
 */
export class Cluster<T extends HandlersMap> {
  protected systemReceiverLayer: RPCReceiverLayer = null
  protected receiverLayer: RPCReceiverLayer = null

  /**
   * Initialize whole app cluster holder.
   * @param initializators is map of posible workes, these methods will be called, when you call run.[name] from
   * master process.
   * @param handlers this is handler on master process, which can be called from forks.
   */
  constructor(protected readonly initializators: T) {
    if (!cluster.isMaster) {
      this.systemReceiverLayer = new RPCReceiverLayer({
        INITIALIZE_WORKER: this.initializeWorker,
        PING: this.ping,
      })
    }
  }

  /**
   * Get initializator handler
   */
  public get run(): { [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ForkHandler<Await<ReturnType<T[K]>>>> } {
    if (cluster.isMaster) {
      return new Proxy(this as any, {
        get:
          (target, propKey, receiver) =>
          async (...args) => {
            const fork = new ForkHandler(propKey.toString(), args)
            await fork.init()
            return fork
          },
      })
    } else {
      throw new Error('Starting of forks outside of master process is not allowed')
    }
  }

  /**
   * Internal initializator
   * @param name
   * @param args
   * @returns
   */
  protected initializeWorker = async (name: string, args: any[]) => {
    // if already initialized
    if (this.receiverLayer) {
      throw new Error('Worker was already initialized.')
    }

    if (this.initializators[name]) {
      this.receiverLayer = new RPCReceiverLayer(await this.initializators[name](...args))
      return
    }
    throw new Error(`Worker with name ${name} does not exists.`)
  }

  /**
   * Ping response
   * @returns
   */
  protected ping = async () => Date.now()
}
