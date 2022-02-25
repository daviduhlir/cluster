export declare class MessageResultError extends Error {
    constructor(message: string, stack: string, originalStack?: string);
}
export declare class MessageTransferRejected extends Error {
    constructor(message: string, stack: string, originalStack?: string);
}
export declare class MethodNotFound extends Error {
    constructor(message?: string);
}
export declare class TrasferedError extends Error {
    readonly original: Error;
    constructor(original: Error, stackFilteredFiles: string[]);
}
