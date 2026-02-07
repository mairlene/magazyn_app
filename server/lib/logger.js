const util = require('util');

// LOG_LEVEL controls which messages are emitted. Supported levels:
//   error (0), warn (1), info (2), debug (3)
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const envLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();
const currentLevel = LEVELS[envLevel] !== undefined ? LEVELS[envLevel] : LEVELS.info;

function formatArgs(args) {
  return args.map(a => (typeof a === 'string' ? a : util.inspect(a, { depth: 2, colors: false }))).join(' ');
}

function shouldLog(level) {
  const lvl = LEVELS[level] !== undefined ? LEVELS[level] : LEVELS.info;
  return lvl <= currentLevel;
}

module.exports = {
  debug: (...args) => {
    if (!shouldLog('debug')) return;
    try {
      console.warn('[DEBUG]', formatArgs(args));
    } catch (e) {}
  },
  info: (...args) => {
    if (!shouldLog('info')) return;
    try {
      console.warn('[INFO]', formatArgs(args));
    } catch (e) {}
  },
  warn: (...args) => {
    if (!shouldLog('warn')) return;
    try {
      console.warn('[WARN]', formatArgs(args));
    } catch (e) {}
  },
  error: (...args) => {
    if (!shouldLog('error')) return;
    try {
      console.error('[ERROR]', formatArgs(args));
    } catch (e) {}
  },
  child: (name) => ({
    debug: (...a) => module.exports.debug(`[${name}]`, ...a),
    info: (...a) => module.exports.info(`[${name}]`, ...a),
    warn: (...a) => module.exports.warn(`[${name}]`, ...a),
    error: (...a) => module.exports.error(`[${name}]`, ...a),
  })
};
