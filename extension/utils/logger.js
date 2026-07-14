(function () {
    const getTimestamp = () => {
        const now = new Date();
        return now.toTimeString().split(' ')[0]; // HH:MM:SS
    };

    const LOG_COLORS = {
        INFO: '#00E676',   // Neon Green
        WARN: '#FFD600',   // Amber Yellow
        ERROR: '#FF1744'   // Vibrant Red
    };

    const log = (level, code, message, ...args) => {
        if (level === 'INFO') return; // Suppress INFO logs entirely in console
        
        const time = getTimestamp();
        const color = LOG_COLORS[level] || '#fff';
        const formattedPrefix = `%c[UNFUGLY CS] ${time} ${level} | ${code}:`;
        const style = `color: ${color}; font-weight: bold;`;
        
        if (level === 'ERROR') {
            console.error(formattedPrefix, style, message, ...args);
        } else if (level === 'WARN') {
            console.warn(formattedPrefix, style, message, ...args);
        }
    };

    window.UnfuglyLog = {
        info: (code, message, ...args) => log('INFO', code, message, ...args),
        warn: (code, message, ...args) => log('WARN', code, message, ...args),
        error: (code, message, ...args) => log('ERROR', code, message, ...args)
    };
})();
