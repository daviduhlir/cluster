import { RPCTransmitLayer } from '../RPC/RPCTransmitLayer'
import * as cluster from 'cluster'
import { ClusterHolder } from '../utils/ClusterHolder'

export const WORKER_INITIALIZED = 'WORKER_INITIALIZED'

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
      await this.as<WorkerSystemHandler>().INITIALIZE_WORKER(this.name, this.args)

      // TODO, this hack is here, because when you will attach to this event after starting of cluster
      // you will not receive it (this method is part of init process, and this event will be emitted before end of promise)
      setImmediate(() => this.emit(WORKER_INITIALIZED))
      return
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
    this.process = ClusterHolder.fork()
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
