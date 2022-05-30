import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer'
import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer'
import { HandlersMap } from '../utils/types'
import * as cluster from 'cluster'

/**
 * Master process receiver
 */
export class MasterHandler<T extends HandlersMap> {
  protected static alreadyInitialized: boolean = false
  protected receiverLayer: RPCReceiverLayer = null
  protected transmitLayer: RPCTransmitLayer = null

  public static Initialize<T extends HandlersMap>(initializators: T): MasterHandler<T> {
    if (MasterHandler.alreadyInitialized) {
      throw new Error(`Master handler can be initialized only once.`)
    }
    MasterHandler.alreadyInitialized = true
    return new MasterHandler(initializators)
  }

  protected constructor(protected readonly handlers: T) {
    if (cluster.isMaster) {
      this.receiverLayer = new RPCReceiverLayer(handlers)
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
