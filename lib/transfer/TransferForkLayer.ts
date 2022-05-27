import * as cluster from 'cluster';
import { TransferIPCLayer } from './TransferIPCLayer';

/**
 * Configuration for fork
 */
export interface ForkConfig {
    PING_INTERVAL?: number;
    PING_MAX_TIME?: number;
}

export const forkDefaultConfig = {
    PING_INTERVAL: 5000,
    PING_MAX_TIME: 1000,
};

export class TransferForkLayer extends TransferIPCLayer {
    constructor(
        public readonly args: {[anything: string]: any} = {},
        public readonly config: ForkConfig = forkDefaultConfig,
    ) {
        super(cluster.fork(args));

        if (!cluster.isMaster) {
            throw new Error('Local fork handler can be created only from master process');
        }

        this.resetPing();
    }

    /**
     * Kill worker
     */
    public stop() {
        if (this.pingInterval){
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        this.living = false;
        (this.worker as cluster.Worker)?.process.kill('SIGKILL');
        this.setWorker(null);
    }

    /**
     * Restart worker
     */
    public restart() {
        console.log(`Fork force restart`);
        (this.worker as cluster.Worker)?.process.kill('SIGKILL');
        this.setWorker(null);
    }

    /**
     * Call ping
     * @param txAdapter
     */
    public ping() {
        /*if (this.living) {
            // if this is on local
            // timeout, we will wait this tome before kill this fork
            const killTimeout = setTimeout(() => {
                console.warn(`Fork not responding to ping.`);
                this.restart();
            }, this.config.PING_MAX_TIME);

            // call ping
            this.as<any>().ping()
                .then(() => {
                    clearTimeout(killTimeout);
                }, (e) => {
                    console.warn(`Fork ping failed.`, e);
                    clearTimeout(killTimeout);
                    this.restart();
                });
        }*/
    }

    /**********************************
     *
     * Internal methods
     *
     **********************************/
    protected living: boolean = true;
    protected pingInterval: any = null;

    /**
     * Reset ping interval
     */
    protected resetPing() {
        if (this.pingInterval){
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        // ping interval
        if (this.config.PING_INTERVAL) {
            this.pingInterval = setInterval(() => this.ping(), this.config.PING_INTERVAL);
        }
    }

    /**
     * Overload of set worker, it hande the crashes on it.
     */
    protected setWorker(worker) {
        super.setWorker(worker);

        if (worker) {
            // restart fork if my fork is died
            worker.on('exit', (code, signal) => {
                if (this.living) {
                    console.error(`Fork died with code ${code}, will be restarted`);
                    this.setWorker(cluster.fork(this.args));
                    this.resetPing();
                } else {
                    console.error(`Fork died with code ${code}.`);
                }
            });
        }
    }
}
