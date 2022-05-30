import * as cluster from 'cluster'
import { randomHash } from '../utils/utils'
import { EventEmitter } from 'events'

export type ProcessType = NodeJS.Process | cluster.Worker

export const PROCESS_CHANGED = 'PROCESS_CHANGED'

/**
 * Layer for sending messages as promise to receiver layer
 */
export class RPCTransmitLayer extends EventEmitter {
  protected processHandler: ProcessType

  /**
   * @param process Process is what are you targeting
   */
  constructor(process?: ProcessType) {
    super()
    if (process) {
      this.process = process
    }
  }

  /**
   * Set process
   */
  public set process(process: ProcessType) {
    this.emit(PROCESS_CHANGED, {
      oldProcess: this.processHandler,
      newProcess: process,
    })
    this.processHandler = process
  }

  /**
   * Get process
   */
  public get process(): ProcessType {
    return this.processHandler
  }

  /**
   * Get proxy object, where every each property you get will be returned
   * as method call to receiver layer. Use template to keep typeings of your receiver on it.
   */
  public as<T>(): T {
    return new Proxy(this as any, {
      get:
        (target, propKey, receiver) =>
        (...args) =>
          this.callMethod(propKey.toString(), args),
    })
  }

  /**
   * Call method on receiver
   * @param methodName
   * @param args
   * @returns
   */
  protected async callMethod(methodName: string, args: any[]): Promise<any> {
    if (!this.process) {
      throw new Error('Target process is not set.')
    }

    const hash = randomHash()

    return new Promise((resolve, reject) => {
      // message handler
      const processDieHandler = () => {
        reject(new Error(`Process died, call of method ${methodName} was stopped.`))
        this.removeListener(PROCESS_CHANGED, processDieHandler)
      }

      const messageHandler = message => {
        if (
          typeof message === 'object' &&
          !Array.isArray(message) &&
          message.hasOwnProperty('RPC_MESSAGE') &&
          message.hasOwnProperty('CALL_METHOD') &&
          message.RPC_MESSAGE === hash
        ) {
          this.process.removeListener('message', messageHandler)
          this.removeListener(PROCESS_CHANGED, processDieHandler)

          if (message.error) {
            reject(new Error(message.error))
          } else {
            resolve(message.result)
          }
        }
      }
      this.process.addListener('message', messageHandler)
      this.addListener(PROCESS_CHANGED, processDieHandler)

      this.sendRaw({
        RPC_MESSAGE: hash,
        CALL_METHOD: methodName,
        WORKER: cluster.isMaster ? 'master' : cluster.worker.id,
        args,
      })
    })
  }

  /**
   * Send IPC message
   */
  protected sendRaw(message: any) {
    this.process.send({
      ...message,
    })
  }
}
