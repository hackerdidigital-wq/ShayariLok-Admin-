import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMarkdownWrap,
  insertAtCursor,
  parseRichShayariLine,
  stripRichFormatting,
} from './richTextShayari';

test('applyMarkdownWrap formats bold, italic, quote, and sparkle cleanly', () => {
  const bolded = applyMarkdownWrap('दिल की बात', 0, 3, 'bold');
  assert.equal(bolded.nextValue, '**दिल** की बात');

  const quoted = applyMarkdownWrap('लाइन एक\nलाइन दो', 0, 15, 'quote');
  assert.equal(quoted.nextValue, '> लाइन एक\n> लाइन दो');

  const sparkled = applyMarkdownWrap('शुभकामनाएं', 0, 10, 'sparkle');
  assert.equal(sparkled.nextValue, '✨ शुभकामनाएं ✨');
});

test('parseRichShayariLine and stripRichFormatting roundtrip cleanly without HTML', () => {
  const segments = parseRichShayariLine('तेरी **ख़ामोशी** में *प्यार* है');
  assert.deepEqual(segments, [
    { type: 'text', content: 'तेरी ' },
    { type: 'bold', content: 'ख़ामोशी' },
    { type: 'text', content: ' में ' },
    { type: 'italic', content: 'प्यार' },
    { type: 'text', content: ' है' },
  ]);

  assert.equal(
    stripRichFormatting('> **ख़ास** *शायरी*'),
    'ख़ास शायरी'
  );
});

test('insertAtCursor inserts ornaments at exact caret offset', () => {
  const res = insertAtCursor('मोहब्बत है', 7, 7, ' ❤️');
  assert.equal(res.nextValue, 'मोहब्बत ❤️ है');
});
