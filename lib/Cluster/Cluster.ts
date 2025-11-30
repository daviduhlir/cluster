import { IpcMethodHandler } from '@david.uhlir/ipc-method'
import * as cluster from 'cluster'
import { HandlersMap, ArgumentTypes, Await } from '../utils/types'
import { ForkConfig, forkDefaultConfig, ForkHandler, WORKER_DIED } from './ForkHandler'

/**
 * Main cluster initializator
 */
export class Cluster<T extends HandlersMap> {
  protected static alreadyInitialized: boolean = false
  protected runningHandlers: { [name: string]: ForkHandler<any>[] } = {}

  public static ipcMessageSizeLimit = 1024 * 1024 * 10 // 10MB

  protected systemReceiverLayer: IpcMethodHandler = null
  protected receiverLayer: IpcMethodHandler = null
  protected static config: ForkConfig = forkDefaultConfig

  public static Initialize<T extends HandlersMap>(initializators: T, forkConfig?: ForkConfig): Cluster<T> {
    if (Cluster.alreadyInitialized) {
      throw new Error(`Cluster can be initialized only once.`)
    }
    Cluster.config = forkConfig || forkDefaultConfig
    Cluster.alreadyInitialized = true
    return new Cluster(initializators)
  }

  /**
   * Initialize whole app cluster holder.
   * @param initializators is map of posible workes, these methods will be called, when you call run.[name] from
   * master process.
   * @param handlers this is handler on master process, which can be called from forks.
   */
  protected constructor(protected readonly initializators: T) {
    if (!cluster.default.isWorker) {
      this.systemReceiverLayer = new IpcMethodHandler(
        ['cluster-internal'],
        {
          INITIALIZE_WORKER: this.initializeWorker,
          PING: this.ping,
        },
        { messageSizeLimit: Cluster.ipcMessageSizeLimit },
      )
    }
  }

  /**
   * Restarts all running forks
   */
  public restart() {
    Object.keys(this.runningHandlers).forEach(name => this.getRunningForks(name).forEach(fork => fork.restart()))
  }

  /**
   * Get initializator handler
   */
  public get run(): { [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ForkHandler<Await<ReturnType<T[K]>>>> } {
    if (!cluster.default.isWorker) {
      return new Proxy(this as any, {
        get:
          (target, name, receiver) =>
          async (...args) =>
            this.startFork(name.toString(), args, Cluster.config),
      })
    } else {
      throw new Error('Starting of forks outside of master process is not allowed')
    }
  }

  /**
   * Get all runnign forks by name
   */
  public getRunningForks(name: string): ForkHandler<any>[] {
    return this.runningHandlers[name] || []
  }

  /**
   * Remove fork from stored forks
   */
  protected removeRunningFork(fork: ForkHandler<any>) {
    this.runningHandlers[fork.name] = (this.runningHandlers[fork.name] || []).filter(i => i !== fork)
  }

  /**
   * Starts a fork
   */
  protected async startFork(name: string, args: any[], config?: ForkConfig): Promise<ForkHandler<any>> {
    const fork = new ForkHandler(name, args, { MESSAGE_SIZE_LIMIT: Cluster.ipcMessageSizeLimit, ...config })
    await fork.init()
    this.runningHandlers[name] = [...(this.runningHandlers[name] || []), fork]

    fork.addListener(WORKER_DIED, this.removeRunningFork)
    return fork
  }

  /**
   * Internal initializator
   */
  protected initializeWorker = async (name: string, args: any[]) => {
    // if already initialized
    if (this.receiverLayer) {
      throw new Error('Worker was already initialized.')
    }

    if (this.initializators[name]) {
      this.receiverLayer = new IpcMethodHandler(['cluster-fork-user'], await this.initializators[name](...args))
      return
    }
    throw new Error(`Worker with name ${name} does not exists.`)
  }

  /**
   * Ping response
   */
  protected ping = async () => Date.now()
}
