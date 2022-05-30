/// <reference types="node" />
import * as cluster from 'cluster';
import { EventEmitter } from 'events';
export declare const CLUSTER_CHANGED = "CLUSTER_CHANGED";
export declare class ClusterHolder {
    protected static workersArray: cluster.Worker[];
    static readonly emitter: EventEmitter;
    static fork(env?: any): cluster.Worker;
    static get workers(): cluster.Worker[];
    static get isMaster(): boolean;
    protected static onChange(): void;
}
