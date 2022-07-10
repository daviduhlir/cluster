import { AsObject, IpcMethodHandler } from '@david.uhlir/ipc-method'
import * as cluster from 'cluster'

/**
 * Master process receiver/transmitter
 */
export class MasterHandler<T extends Object> {
  protected static createdInstance: MasterHandler<any> = null
  protected methodHandler: IpcMethodHandler = null
  protected receiver: T
  protected receiverProxyWraper: AsObject<T> = null

  public static Initialize<T extends Object>(receiverFactory: () => Promise<T> | T): MasterHandler<T> {
    if (MasterHandler.createdInstance) {
      throw new Error(`Master handler can be initialized only once.`)
    }
    MasterHandler.createdInstance = new MasterHandler(receiverFactory)
    return MasterHandler.createdInstance
  }

  public static getInstance<T extends Object>(): MasterHandler<T> {
    return MasterHandler.createdInstance
  }

  protected constructor(protected readonly receiverFactory: () => Promise<T> | T) {
    this.initialize()
  }

  protected async initialize() {
    if (cluster.isMaster) {
      this.receiver = await this.receiverFactory()
      this.methodHandler = new IpcMethodHandler(['cluster-master-user'], this.receiver || {} as any)

      // just only for calling from master to master
      this.receiverProxyWraper = new Proxy({} as any, {
        get: (target, propKey, receiver) => async (...args) => this.receiver[propKey](...args),
      })

    } else {
      this.methodHandler = new IpcMethodHandler(['cluster-master-user'])
    }
  }

  /**
   * Call something to master process.
   */
  public get tx(): AsObject<T> {
    if (!cluster.isMaster) {
      return this.methodHandler.as<T>()
    }
    return this.receiverProxyWraper
  }
}
