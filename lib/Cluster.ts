import { RPCTransmitLayer, RPCReceiverLayer, PROCESS_CHANGED } from './RPCLayer'
import * as cluster from 'cluster'

export type ArgumentTypes<T> = T extends (...args: infer U) => infer R ? U : never
export type Await<T> = T extends PromiseLike<infer U> ? U : T
export type HandlersMap = { [name: string]: (...args: any[]) => Promise<any> }

/**
 * Fork configuration
 */
export interface ForkConfig {
  PING_INTERVAL?: number
  PING_MAX_TIME?: number
  PING_RESTART_ON_TIMEOUT?: boolean
}

export const forkDefaultConfig = {
  PING_INTERVAL: 5000,
  PING_MAX_TIME: 1000,
  PING_RESTART_ON_TIMEOUT: true,
}
export interface WorkerSystemHandler {
  INITIALIZE_WORKER: (name: string, args: any[]) => Promise<void>
  PING: () => Promise<number>
}

/**
 * Fork handler for main worker to call fork functions
 */
export class ForkHandler<T> extends RPCTransmitLayer {
  protected isLiving = true
  protected pingInterval: any = null

  constructor(protected readonly name: string, protected readonly args: any[], public readonly config: ForkConfig = forkDefaultConfig) {
    super()
    this.fork()
  }

  /**
   * Initialize worker.
   */
  public async init() {
    if (cluster.isMaster) {
      if (!this.isLiving) {
        throw new Error(`You can't call init on worker, that is no longer living.`)
      }
      return this.as<WorkerSystemHandler>().INITIALIZE_WORKER(this.name, this.args)
    }
    throw new Error('Calling of init outside of master process is not allowed')
  }

  /**
   * Get handler, what you can call
   */
  public get call(): T {
    if (!this.isLiving) {
      throw new Error(`You can't call methods on worker, that is no longer living.`)
    }
    return this.as<T>()
  }

  /**
   * Kill worker
   */
  public kill() {
    if (!this.isLiving) {
      throw new Error(`You can't kill worker, that is no longer living.`)
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
    console.log(`CLUSTER [${this.name} ${process.pid}] Call fork force kill`)
    this.isLiving = false
    ;(this.process as cluster.Worker).process.kill('SIGKILL')
    this.stopPing()
  }

  /**
   * Restart worker
   */
  public restart() {
    if (!this.isLiving) {
      throw new Error(`You can't restart worker, that is no longer living.`)
    }
    console.log(`CLUSTER [${this.name} ${process.pid}] Call fork force restart`)
    ;(this.process as cluster.Worker).process.kill('SIGKILL')
    this.stopPing()
  }

  /**
   * Start fork
   */
  protected fork() {
    if (this.process) {
      this.process.removeListener('exit', this.handleStop)
    }
    this.process = cluster.fork()
    this.resetPing()
    this.process.addListener('exit', this.handleStop)
  }

  /**
   * handle stop of process
   */
  protected handleStop = async (code: string, signal: string) => {
    if (this.isLiving) {
      console.error(`CLUSTER [${this.name} ${process.pid}] Fork died with code ${signal}, will be restarted`)
      this.fork()
      await this.init()
    } else {
      console.error(`CLUSTER [${this.name} ${process.pid}] Fork died with code ${signal}.`)
    }
  }

  /**
   * Reset ping interval
   */
  protected resetPing() {
    this.stopPing()
    // ping interval
    if (this.config.PING_INTERVAL && this.process && this.isLiving) {
      this.pingInterval = setInterval(() => this.ping(), this.config.PING_INTERVAL)
    }
  }

  /**
   * Stop ping interval
   */
  protected stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Call ping
   */
  protected async ping() {
    if (this.isLiving) {
      // if this is on local
      // timeout, we will wait this tome before kill this fork
      const killTimeout = setTimeout(() => {
        console.warn(`CLUSTER [${this.name} ${process.pid}] Fork not responding to ping`)
        if (this.config.PING_RESTART_ON_TIMEOUT) {
          this.restart()
        } else {
          this.kill()
        }
      }, this.config.PING_MAX_TIME)

      try {
        await this.as<WorkerSystemHandler>().PING()
      } catch (e) {}

      clearTimeout(killTimeout)
    }
  }
}

/**
 * Main cluster initializator
 */
export class Cluster<T extends HandlersMap, K extends HandlersMap = null> {
  protected initReceiverLayer: RPCReceiverLayer = null
  protected receiverLayer: RPCReceiverLayer = null
  protected transmitLayer: RPCTransmitLayer = null

  /**
   * Initialize whole app cluster holder.
   * @param initializators is map of posible workes, these methods will be called, when you call run.[name] from
   * master process.
   * @param handlers this is handler on master process, which can be called from forks.
   */
  constructor(protected readonly initializators: T, protected readonly handlers: K) {
    if (!cluster.isMaster) {
      this.transmitLayer = new RPCTransmitLayer(process)
      this.initReceiverLayer = new RPCReceiverLayer(
        {
          INITIALIZE_WORKER: this.initializeWorker,
          PING: this.ping,
        },
        process,
      )
    } else {
      this.receiverLayer = new RPCReceiverLayer(handlers)
    }
  }

  /**
   * Get initializator handler
   */
  public get run(): { [K in keyof T]: (...args: ArgumentTypes<T[K]>) => Promise<ForkHandler<Await<ReturnType<T[K]>>>> } {
    if (cluster.isMaster) {
      return new Proxy(this as any, {
        get:
          (target, propKey, receiver) =>
          async (...args) => {
            const fork = new ForkHandler(propKey.toString(), args)
            this.receiverLayer.attach(fork.process)

            fork.addListener(PROCESS_CHANGED, ({ oldProcess, newProcess }) => {
              if (oldProcess) {
                this.receiverLayer.detach(oldProcess)
              }
              if (newProcess) {
                this.receiverLayer.attach(oldProcess)
              }
            })

            await fork.init()
            return fork
          },
      })
    } else {
      throw new Error('Starting of forks outside of master process is not allowed')
    }
  }

  /**
   * Call something to master process.
   */
  public get call(): K {
    if (!cluster.isMaster) {
      return this.transmitLayer.as<K>()
    }
    return null
  }

  /**
   * Internal initializator
   * @param name
   * @param args
   * @returns
   */
  protected initializeWorker = async (name: string, args: any[]) => {
    // if already initialized
    if (this.receiverLayer) {
      throw new Error('Worker was already initialized.')
    }

    if (this.initializators[name]) {
      this.receiverLayer = new RPCReceiverLayer(await this.initializators[name](...args), process)
      return
    }
    throw new Error(`Worker with name ${name} does not exists.`)
  }

  /**
   * Ping response
   * @returns
   */
  protected ping = async () => Date.now()
}
