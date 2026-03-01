export function log(level, message, fields = {}) {
  const payload = {
    level,
    message,
    ts: new Date().toISOString(),
    ...fields
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}
