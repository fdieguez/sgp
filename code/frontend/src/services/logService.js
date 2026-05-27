import api from '../config/axios';

const logToServer = async (level, message, stack = '') => {
    try {
        await api.post('/api/logs/frontend', {
            level,
            message,
            stack
        });
    } catch (err) {
        // Silently fail to avoid infinite loops if logging fails
        console.error('Failed to send log to server', err);
    }
};

export const logger = {
    info: (msg) => {
        console.log(msg);
        logToServer('INFO', msg);
    },
    warn: (msg) => {
        console.warn(msg);
        logToServer('WARN', msg);
    },
    error: (msg, err = null) => {
        console.error(msg, err);
        logToServer('ERROR', msg, err?.stack || '');
    }
};
