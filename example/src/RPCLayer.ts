import * as cluster from 'cluster';

function randomHash(): string {
  return [...Array(10)]
    .map(x => 0)
    .map(() => Math.random().toString(36).slice(2))
    .join('')
}

export class RPCTransmitLayer {
    constructor(
        public readonly process: NodeJS.Process | cluster.Worker,
    ) {}

    public async callMethod(mthodName: string, args: any[]): Promise<any> {
      const hash = randomHash()

      return new Promise((resolve, reject) => {
        // message handler
        const messageHandler = (message) => {
          if (
            typeof message === 'object' && !Array.isArray(message) &&
            message.hasOwnProperty('RPC_MESSAGE') &&
            message.hasOwnProperty('CALL_METHOD') &&
            message.RPC_MESSAGE === hash
          ) {
            this.process.removeListener('message', messageHandler);

            if (message.error) {
                reject(new Error(message.error))
            } else {
                resolve(message.result);
            }
          }
        };
        this.process.addListener('message', messageHandler);

        this.sendRaw({
          RPC_MESSAGE: hash,
          CALL_METHOD: mthodName,
          args,
        })
      });
    }

    public as<T>(): T {
      return new Proxy(this as any, {
          get: (target, propKey, receiver) =>
              (...args) => this.callMethod(propKey.toString(), args)
      });
    }

    protected sendRaw(message: any) {
      this.process.send({
          ...message,
      })
  }
}

export class RPCReceiverLayer {
  constructor(
      public readonly process: NodeJS.Process | cluster.Worker,
      protected readonly handlers: {[name: string]: (...args: any[]) => Promise<any>} = null,
  ) {
    if (handlers) {
      process.addListener('message', this.handleIncommingMessage)
    }
  }

  public detach() {
    process.removeListener('message', this.handleIncommingMessage)
  }

  protected handleIncommingMessage = async (message) => {
      // init worker
      if (message.RPC_MESSAGE && message.CALL_METHOD && this.handlers?.[message.CALL_METHOD]) {
        try {
          const result = await this.handlers[message.CALL_METHOD](...message.args)
          this.process.send({
              RPC_MESSAGE: message.RPC_MESSAGE,
              CALL_METHOD: message.CALL_METHOD,
              result,
          })
        } catch(e) {
          this.process.send({
            RPC_MESSAGE: message.RPC_MESSAGE,
            CALL_METHOD: message.CALL_METHOD,
            error: e.message,
          })
        }
      }
  }
}
