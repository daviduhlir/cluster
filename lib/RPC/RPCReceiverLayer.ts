import * as cluster from 'cluster'
import { ClusterHolder, CLUSTER_CHANGED } from '../utils/ClusterHolder'
import { ProcessType } from '../utils/types'
import { randomHash } from '../utils/utils'

/**
 * Receiver layer is responder for RPC.
 * This is basicaly, where all methods will be executed, when it's received from transmit layer.
 */
export class RPCReceiverLayer<T extends Object = {}> {
  public static receivers: {[hash: string]: RPCReceiverLayer<any>} = {}
  public static attached: boolean = false

  protected receiverHash: string

  /**
   * @param handlers map of methods, that can be called from outside
   * @param process what you are listening, you can attach more by calling attach method
   */
  constructor(protected readonly receiver: T) {
    if (!RPCReceiverLayer.attached) {
      if (cluster.isMaster) {
        ClusterHolder.emitter.on(CLUSTER_CHANGED, RPCReceiverLayer.onClusterChange)
      } else {
        process.addListener('message', RPCReceiverLayer.handleIncommingMessage)
      }
      RPCReceiverLayer.attached = true
    }

    // register receiver here
    this.receiverHash = randomHash()
    RPCReceiverLayer.receivers[this.receiverHash] = this
  }

  /**
   * Remove this layer
   */
  public destroy() {
    delete RPCReceiverLayer.receivers[this.receiverHash]
  }

  /**
   * Is method on receiver
   */
  protected hasMethod(name: string): boolean {
    return typeof this.receiver[name] === 'function'
  }

  /**
   * Call method on receiver
   */
  protected async callMethod(name: string, args: any[]) {
    return this.receiver[name](...args)
  }

  /**
   * Reattach all listeners
   * @param param0
   */
  protected static onClusterChange({oldWorkers, newWorkers}: {oldWorkers: cluster.Worker[], newWorkers: cluster.Worker[]}) {
    oldWorkers.forEach(w => w.removeListener('message', RPCReceiverLayer.handleIncommingMessage))
    newWorkers.forEach(w => w.addListener('message', RPCReceiverLayer.handleIncommingMessage))
  }

  /**
   * Get all receivers
   */
  protected static getReceivers(): RPCReceiverLayer<any>[] {
    return Object.keys(RPCReceiverLayer.receivers).reduce((acc, i) => ([...acc, RPCReceiverLayer.receivers[i]]), [])
  }

  /**
   * Internal message handler
   * @param sender
   * @param message
   */
  protected static async handleIncommingMessage(message) {
    if (message.RPC_MESSAGE &&
        message.CALL_METHOD &&
        (typeof message.WORKER === 'number' || message.WORKER === 'master')
    ) {
      const sender = message.WORKER === 'master' ? process : cluster.workers[message.WORKER]

      const results: {result?: any; error?: any}[] = await Promise.all(RPCReceiverLayer.getReceivers()
        .filter(receiver => receiver.hasMethod(message.CALL_METHOD))
        .map(receiver => {
          return receiver.callMethod(message.CALL_METHOD, message.args)
            .then(result => ({
              CALL_STATUS: 'METHOD_CALL_SUCCESS',
              result
            }), error => ({
              CALL_STATUS: 'METHOD_CALL_ERROR',
              error
            }))
        }))

      if (results.length === 0) {
        sender.send({
          RPC_MESSAGE: message.RPC_MESSAGE,
          CALL_METHOD: message.CALL_METHOD,
          error: 'METHOD_NOT_FOUND',
        })
        return
      }

      sender.send({
        RPC_MESSAGE: message.RPC_MESSAGE,
        CALL_METHOD: message.CALL_METHOD,
        results,
      })
    }
  }
}
