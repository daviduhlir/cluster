import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer'
import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer'
import * as cluster from 'cluster'

/**
 * Master process receiver/transmitter
 */
export class MasterHandler<T extends Object> {
  protected static createdInstance: MasterHandler<any> = null
  protected receiverLayer: RPCReceiverLayer = null
  protected transmitLayer: RPCTransmitLayer = null
  protected receiver: T

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
      this.receiverLayer = new RPCReceiverLayer(this.receiver || {})
    } else {
      this.transmitLayer = new RPCTransmitLayer(process)
    }
  }

  /**
   * Call something to master process.
   */
  public get call(): T {
    if (!cluster.isMaster) {
      return this.transmitLayer.as<T>()
    }
    return null
  }
}
