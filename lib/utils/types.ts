export type ArgumentTypes<T> = T extends (...args: infer U) => infer R ? U : never
export type Await<T> = T extends PromiseLike<infer U> ? U : T
export type HandlersMap = { [name: string]: (...args: any[]) => Promise<any> }
