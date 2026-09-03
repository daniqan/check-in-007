import test from 'node:test';
import assert from 'node:assert/strict';
import * as der from '../../scripts/lib/der.mjs';

function hex(value) {
  return value.toString('hex');
}

function readTlvLength(value) {
  if (value[1] < 0x80) return { header: 2, length: value[1] };
  const count = value[1] & 0x7f;
  return { header: 2 + count, length: value.readUIntBE(2, count) };
}

test('encodes DER lengths, integers, OIDs, and UTC time exactly', () => {
  assert.equal(hex(der.encodeLength(127)), '7f');
  assert.equal(hex(der.encodeLength(128)), '8180');
  assert.equal(hex(der.encodeLength(256)), '820100');
  assert.equal(hex(der.int(255)), '020200ff');
  assert.equal(hex(der.int(127)), '02017f');
  assert.equal(hex(der.oid('1.2.840.113549.1.1.11')), '06092a864886f70d01010b');
  assert.equal(hex(der.oid('2.5.4.3')), '0603550403');
  assert.equal(hex(der.oid('1.3.6.1.5.5.7.3.1')), '06082b06010505070301');
  assert.equal(hex(der.oid('2.5.29.17')), '0603551d11');
  assert.equal(
    hex(der.utcTime(new Date('2026-01-02T03:04:05Z'))),
    '170d3236303130323033303430355a',
  );
});

test('encodes KeyUsage digitalSignature plus keyEncipherment with five unused bits', () => {
  assert.equal(hex(der.bitString(Buffer.from([0xa0]), 5)), '030205a0');
});

test('all primitive helpers have correct tags and round-tripping lengths', () => {
  const samples = [
    [der.seq(der.int(1)), 0x30],
    [der.set(der.int(1)), 0x31],
    [der.bitString(Buffer.alloc(200)), 0x03],
    [der.octetString(Buffer.from('x')), 0x04],
    [der.utf8String('007'), 0x0c],
    [der.ia5String('host.local'), 0x16],
    [der.boolean(true), 0x01],
    [der.nullValue(), 0x05],
    [der.explicit(3, der.seq()), 0xa3],
    [der.implicit(7, Buffer.from([127, 0, 0, 1])), 0x87],
  ];
  for (const [encoded, tag] of samples) {
    assert.equal(encoded[0], tag);
    const { header, length } = readTlvLength(encoded);
    assert.equal(header + length, encoded.length);
  }
});

test('rejects invalid values and UTCTime outside its supported window', () => {
  assert.throws(() => der.encodeLength(-1), /length/);
  assert.throws(() => der.int(-1), /non-negative/);
  assert.throws(() => der.oid('1.40.1'), /OID/);
  assert.throws(() => der.utcTime(new Date('2050-01-01T00:00:00Z')), /1950 through 2049/);
});
