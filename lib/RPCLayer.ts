import * as cluster from 'cluster'
import { randomHash } from './utils'
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

/**
 * Receiver layer is responder for RPC.
 * This is basicaly, where all methods will be executed, when it's received from transmit layer.
 */
export class RPCReceiverLayer {
  protected attached = []

  /**
   * @param handlers map of methods, that can be called from outside
   * @param process what you are listening, you can attach more by calling attach method
   */
  constructor(protected readonly handlers: { [name: string]: (...args: any[]) => Promise<any> }, public readonly process: ProcessType = null) {
    if (this.process) {
      this.attach(this.process)
    }
  }

  /**
   * Attach process
   */
  public attach(process: ProcessType) {
    const method = this.handleIncommingMessage.bind(this, process)
    this.attached.push([process, method])
    process.addListener('message', method)
  }

  /**
   * Detach process
   */
  public detach(process: ProcessType) {
    const t = this.attached.find(i => i[0] === process)
    if (t) {
      process.removeListener('message', t[1])
      this.attached = this.attached.filter(i => i[0] !== process)
    }
  }

  /**
   * Remove all handlers
   */
  public destroy() {
    this.attached.forEach(i => {
      process.removeListener('message', i[1])
    })
    this.attached = []
  }

  /**
   * Internal message handler
   * @param sender
   * @param message
   */
  protected handleIncommingMessage = async (sender, message) => {
    // init worker
    if (message.RPC_MESSAGE && message.CALL_METHOD && this.handlers?.[message.CALL_METHOD]) {
      try {
        const result = await this.handlers[message.CALL_METHOD](...message.args)
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
