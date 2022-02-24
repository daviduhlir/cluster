"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stackTraceParser = require("stacktrace-parser");
function filterFiles(stack, filterFileNames) {
    const parts = stackTraceParser.parse(stack);
    let fileNames = filterFileNames ? filterFileNames : [parts[0].file];
    return parts.filter((i) => !fileNames.includes(i.file))
        .map((i) => `    at ${i.methodName} (${i.file}:${i.lineNumber}${typeof i.column === 'number' ? ':' + i.column : ''})`)
        .join('\n');
}
exports.filterFiles = filterFiles;
function extractFilename(stack) {
    const parts = stackTraceParser.parse(stack);
    return parts[0].file;
}
exports.extractFilename = extractFilename;
//# sourceMappingURL=stackTrace.js.map