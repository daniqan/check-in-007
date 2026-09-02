export function formatLocalIso(date = new Date()) {
  const pad = (value, size = 2) => String(Math.trunc(Math.abs(value))).padStart(size, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(hours)}:${pad(minutes)}`;
}

export function displayName(name) {
  return String(name ?? '').trim() || 'UNKNOWN AGENT';
}

export function displayTable(table) {
  return String(table ?? '').trim() || 'PROCEED TO THE CHECK-IN DESK';
}

export function truncateDisplay(value, max = 80) {
  const text = String(value ?? '').trim();
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}...`;
}
