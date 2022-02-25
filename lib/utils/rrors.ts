import { extractFilename, filterFiles } from "./stackTrace";

export class MessageResultError extends Error {
    constructor(message: string, stack: string, originalStack?: string) {
        super(message);
        this.stack = `Error: ${message}\n${stack}`;

        // restore prototype chain
        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any).__proto__ = actualProto;
        }
    }
}

export class MessageTransferRejected extends Error {
    constructor(message: string, stack: string, originalStack?: string) {
        super(message);
        this.stack = `Error: ${message}\n${stack}`;

        // restore prototype chain
        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any).__proto__ = actualProto;
        }
    }
}

/**
 * Error when method on receiver was not found
 */
 export class MethodNotFound extends Error {
    constructor(message?: string) {
        super(message);

        // restore prototype chain
        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any).__proto__ = actualProto;
        }
    }
}

/**
 * Error with trasfered stack, it will remove last caller
 */
export class TrasferedError extends Error {
    constructor(public readonly original: Error, stackFilteredFiles: string[]) {
        super(original.message);
        this.stack = filterFiles(original.stack, stackFilteredFiles);

        // restore prototype chain
        const actualProto = new.target.prototype;

        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        } else {
            (this as any).__proto__ = actualProto;
        }
    }
}