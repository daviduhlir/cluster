"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function randomHash() {
    return [...Array(10)]
        .map(x => 0)
        .map(() => Math.random().toString(36).slice(2))
        .join('');
}
exports.randomHash = randomHash;
//# sourceMappingURL=utils.js.map