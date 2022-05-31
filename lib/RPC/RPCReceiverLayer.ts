import * as cluster from 'cluster'
import { ClusterHolder, CLUSTER_CHANGED } from '../utils/ClusterHolder'

/**
 * Receiver layer is responder for RPC.
 * This is basicaly, where all methods will be executed, when it's received from transmit layer.
 */
export class RPCReceiverLayer<T extends Object = {}> {
  /**
   * @param handlers map of methods, that can be called from outside
   * @param process what you are listening, you can attach more by calling attach method
   */
  constructor(protected readonly receiver: T) {
    if (cluster.isMaster) {
      ClusterHolder.emitter.on(CLUSTER_CHANGED, this.onClusterChange)
    } else {
      process.addListener('message', this.handleIncommingMessage)
    }
  }

  /**
   * Reattach all listeners
   * @param param0
   */
  protected onClusterChange = ({oldWorkers, newWorkers}: {oldWorkers: cluster.Worker[], newWorkers: cluster.Worker[]}) => {
    oldWorkers.forEach(w => w.removeListener('message', this.handleIncommingMessage))
    newWorkers.forEach(w => w.addListener('message', this.handleIncommingMessage))
  }

  /**
   * Internal message handler
   * @param sender
   * @param message
   */
  protected handleIncommingMessage = async message => {
    // init worker
    if (message.RPC_MESSAGE &&
        message.CALL_METHOD &&
        typeof this.receiver[message.CALL_METHOD] === 'function'
      ) {
      const sender = message.WORKER === 'master' ? process : cluster.workers[message.WORKER]

      try {
        const result = await this.receiver[message.CALL_METHOD](...message.args)
        sender.send({
          RPC_MESSAGE: message.RPC_MESSAGE,
          CALL_METHOD: message.CALL_METHOD,
          result,
        })
      } catch (e) {
        sender.send({
          RPC_MESSAGE: message.RPC_MESSAGE,
          CALL_METHOD: message.CALL_METHOD,
          error: e.message,
        })
      }
    }
  }
}
