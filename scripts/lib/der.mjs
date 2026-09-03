// Minimal ASN.1 DER helpers for the X.509 certificate emitted by dev-cert.mjs.

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

export function encodeLength(length) {
  if (!Number.isSafeInteger(length) || length < 0) throw new RangeError('Invalid DER length');
  if (length < 0x80) return Buffer.from([length]);
  const bytes = [];
  for (let value = length; value > 0; value = Math.floor(value / 256)) bytes.unshift(value & 0xff);
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

export function tlv(tag, value) {
  const bytes = asBuffer(value);
  return Buffer.concat([Buffer.from([tag]), encodeLength(bytes.length), bytes]);
}

export function seq(...parts) {
  return tlv(0x30, Buffer.concat(parts));
}

export function set(...parts) {
  return tlv(0x31, Buffer.concat(parts));
}

export function int(value) {
  let bytes;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError('DER integer must be non-negative');
    const out = [];
    do {
      out.unshift(value & 0xff);
      value = Math.floor(value / 256);
    } while (value > 0);
    bytes = Buffer.from(out);
  } else {
    bytes = asBuffer(value);
    while (bytes.length > 1 && bytes[0] === 0 && (bytes[1] & 0x80) === 0) bytes = bytes.subarray(1);
    if (bytes.length === 0) bytes = Buffer.from([0]);
  }
  if (bytes[0] & 0x80) bytes = Buffer.concat([Buffer.from([0]), bytes]);
  return tlv(0x02, bytes);
}

export function bitString(value, unusedBits = 0) {
  if (!Number.isInteger(unusedBits) || unusedBits < 0 || unusedBits > 7)
    throw new RangeError('Invalid unused bit count');
  return tlv(0x03, Buffer.concat([Buffer.from([unusedBits]), asBuffer(value)]));
}

export function octetString(value) {
  return tlv(0x04, asBuffer(value));
}

function base128(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Invalid OID arc');
  const bytes = [value & 0x7f];
  for (value = Math.floor(value / 128); value > 0; value = Math.floor(value / 128))
    bytes.unshift((value & 0x7f) | 0x80);
  return bytes;
}

export function oid(dotted) {
  const arcs = dotted.split('.').map(Number);
  if (
    arcs.length < 2 ||
    ![0, 1, 2].includes(arcs[0]) ||
    arcs[1] < 0 ||
    (arcs[0] < 2 && arcs[1] > 39)
  )
    throw new RangeError('Invalid OID');
  return tlv(
    0x06,
    Buffer.from([...base128(arcs[0] * 40 + arcs[1]), ...arcs.slice(2).flatMap(base128)]),
  );
}

export function utf8String(value) {
  return tlv(0x0c, Buffer.from(value, 'utf8'));
}

export function ia5String(value) {
  if (!/^[\x00-\x7f]*$/.test(value)) throw new TypeError('IA5String must contain ASCII only');
  return tlv(0x16, Buffer.from(value, 'ascii'));
}

export function boolean(value) {
  return tlv(0x01, Buffer.from([value ? 0xff : 0]));
}

export function nullValue() {
  return tlv(0x05, Buffer.alloc(0));
}

export function utcTime(date) {
  const year = date.getUTCFullYear();
  if (year < 1950 || year >= 2050 || Number.isNaN(date.getTime()))
    throw new RangeError('UTCTime supports years 1950 through 2049');
  const two = (value) => String(value).padStart(2, '0');
  const text = `${two(year % 100)}${two(date.getUTCMonth() + 1)}${two(date.getUTCDate())}${two(date.getUTCHours())}${two(date.getUTCMinutes())}${two(date.getUTCSeconds())}Z`;
  return tlv(0x17, Buffer.from(text, 'ascii'));
}

export function explicit(tagNumber, inner) {
  return tlv(0xa0 | tagNumber, asBuffer(inner));
}

export function implicit(tagNumber, value) {
  return tlv(0x80 | tagNumber, asBuffer(value));
}

export function raw(value) {
  return asBuffer(value);
}
