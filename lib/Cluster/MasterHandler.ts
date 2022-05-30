import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer'
import { RPCReceiverLayer } from '../RPC/RPCReceiverLayer'
import { HandlersMap } from '../utils/types'
import * as cluster from 'cluster'

/**
 * Master process receiver
 */
export class MasterHandler<T extends HandlersMap = null> {
  protected receiverLayer: RPCReceiverLayer = null
  protected transmitLayer: RPCTransmitLayer = null

  constructor(protected readonly handlers: T) {
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
