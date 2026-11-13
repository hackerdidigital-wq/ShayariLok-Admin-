import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeUtf8Base64,
  encodeUtf8Base64,
  getUtf8ByteLength,
} from './base64';

test('UTF-8 Base64 roundtrip preserves Devanagari, Hinglish, and multiline text', () => {
  const sample =
    'तेरी ख़ामोशी भी मुझसे कुछ कहती है,\nहर धड़कन में तेरी ही याद रहती है। ❤️\nKabhi lafzon mein na dhoondhna!';
  const encoded = encodeUtf8Base64(sample);
  const decoded = decodeUtf8Base64(encoded);
  assert.equal(decoded, sample);
});

test('decodeUtf8Base64 handles GitHub line-wrapped Base64 payloads', () => {
  const original = JSON.stringify({
    app_name: 'Shayari Lok',
    message: 'दिल की बात ख़ामोशी से कह दी\nदूसरी पंक्ति',
  });
  const encoded = encodeUtf8Base64(original);
  // Simulate GitHub 60-char line wrapping
  const wrapped = encoded.replace(/(.{12})/g, '$1\n');
  assert.equal(decodeUtf8Base64(wrapped), original);
});

test('getUtf8ByteLength accurately measures multi-byte Devanagari text', () => {
  assert.equal(getUtf8ByteLength('abc'), 3);
  assert.ok(getUtf8ByteLength('शायरी') > 5);
});
