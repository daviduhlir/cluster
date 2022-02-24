"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stackTrace_1 = require("./stackTrace");
class MessageResultError extends Error {
    constructor(message, stack, originalStack) {
        super(message);
        this.stack = `Error: ${message}\n${stack}`;
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = actualProto;
        }
    }
}
exports.MessageResultError = MessageResultError;
class MessageTransferRejected extends Error {
    constructor(message, stack, originalStack) {
        super(message);
        this.stack = `Error: ${message}\n${stack}`;
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = actualProto;
        }
    }
}
exports.MessageTransferRejected = MessageTransferRejected;
class MethodNotFound extends Error {
    constructor(message) {
        super(message);
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = actualProto;
        }
    }
}
exports.MethodNotFound = MethodNotFound;
class TrasferedError extends Error {
    constructor(original, stackFilteredFiles) {
        super(original.message);
        this.original = original;
        this.stack = stackTrace_1.filterFiles(original.stack, stackFilteredFiles);
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = actualProto;
        }
    }
}
exports.TrasferedError = TrasferedError;
//# sourceMappingURL=Errors.js.map