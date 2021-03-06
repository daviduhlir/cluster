/// <reference types="node" />
/// <reference types="node" />
import * as cluster from 'cluster';
export declare type ProcessType = NodeJS.Process | cluster.Worker;
export declare type ArgumentTypes<T> = T extends (...args: infer U) => infer R ? U : never;
export declare type Await<T> = T extends PromiseLike<infer U> ? U : T;
export declare type HandlersMap = {
    [name: string]: (...args: any[]) => Promise<any>;
};
