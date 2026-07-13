const originalLog = console.log;
const originalError = console.error;
const originalInfo = console.info;
const originalWarn = console.warn;

function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

console.log = (...args) => originalLog(`[${getTimestamp()}]`, ...args);
console.error = (...args) => originalError(`[${getTimestamp()}] [ERROR]`, ...args);
console.info = (...args) => originalInfo(`[${getTimestamp()}] [INFO]`, ...args);
console.warn = (...args) => originalWarn(`[${getTimestamp()}] [WARN]`, ...args);

// Patch Next.js stdout so we get timestamps for "GET /dashboard 200 in..."
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, callback) => {
    if (typeof chunk === 'string') {
        const ts = `[${getTimestamp()}] `;
        // Only prefix if it looks like a log line, ignoring clear screen commands
        if (chunk.includes('GET /') || chunk.includes('POST /') || chunk.includes('✓')) {
            // Next.js logs often have ansi colors at the beginning. We can just insert the timestamp at the very beginning.
            chunk = ts + chunk;
        }
    }
    return originalStdoutWrite(chunk, encoding, callback);
};
