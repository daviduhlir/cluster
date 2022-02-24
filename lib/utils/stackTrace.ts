import * as stackTraceParser from 'stacktrace-parser';

/**
 * Filter files from stack trace
 */
export function filterFiles(stack: string, filterFileNames?: string[]) {
    const parts = stackTraceParser.parse(stack);
    let fileNames = filterFileNames ? filterFileNames : [parts[0].file];

    return parts.filter((i) => !fileNames.includes(i.file))
        .map((i) => `    at ${i.methodName} (${i.file}:${i.lineNumber}${typeof i.column === 'number' ? ':' + i.column : ''})`)
        .join('\n')
}

/**
 * Get real filename
 */
export function extractFilename(stack: string) {
    const parts = stackTraceParser.parse(stack);
    return parts[0].file;
}