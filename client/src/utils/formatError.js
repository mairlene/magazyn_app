export default function formatError(err) {
  if (!err && err !== 0) return '';
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    if (err.error && typeof err.error === 'string') return err.error;
    if (err.message && typeof err.message === 'string') return err.message;
    try {
      return JSON.stringify(err);
    } catch (e) {
      return String(err);
    }
  }
  return String(err);
}
