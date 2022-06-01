import * as cluster from 'cluster'
import { randomHash } from '../utils/utils'
import { EventEmitter } from 'events'
import { ProcessType } from '../utils/types'

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
      get: (target, propKey, receiver) => (...args) => this.callMethodWithFirstResult(propKey.toString(), args),
    })
  }

  /**
   * Call method on receiver and resutrns first valid result
   */
  protected async callMethodWithFirstResult(methodName: string, args: any[]): Promise<any> {
    const results = await this.callMethod(methodName, args)
    const success = results.find(i => i.CALL_STATUS === 'METHOD_CALL_SUCCESS')
    if (success) {
      return success.result
    } else {
      const error = results.find(i => i.CALL_STATUS === 'METHOD_CALL_ERROR')
      if (error) {
        throw new Error(error.error || 'unknown error')
      } else {
        throw new Error('METHOD_CALL_FAILED')
      }
    }
  }

  /**
   * Call method on receiver
   */
  protected async callMethod(methodName: string, args: any[]): Promise<{result?: any; error?: any; CALL_STATUS: string}[]> {
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
          resolve(message.results)
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
