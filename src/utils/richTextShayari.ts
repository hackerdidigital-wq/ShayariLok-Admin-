export type RichFormatAction = 'bold' | 'italic' | 'quote' | 'sparkle';

export interface RichTextSegment {
  type: 'text' | 'bold' | 'italic' | 'quote';
  content: string;
}

export const QUICK_CATEGORY_PRESETS: ReadonlyArray<string> = [
  'Romantic',
  'Love',
  'Sad',
  'Attitude',
  'Friendship',
  'Dosti',
  'Motivation',
  'Bewafa',
  'Suvichar',
];

export const SHAYARI_ORNAMENTS: ReadonlyArray<{ label: string; token: string }> = [
  { label: 'Heart', token: '❤️' },
  { label: 'Rose', token: '🥀' },
  { label: 'Sparkles', token: '✨' },
  { label: 'Fire', token: '🔥' },
  { label: 'Quill', token: '✍️' },
  { label: 'Divider', token: '\n— ✦ —\n' },
];

export function applyMarkdownWrap(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: RichFormatAction
): { nextValue: string; nextCursorStart: number; nextCursorEnd: number } {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const selected = value.slice(start, end);

  if (action === 'sparkle') {
    const token = selected ? `✨ ${selected} ✨` : '✨ ';
    const nextValue = value.slice(0, start) + token + value.slice(end);
    const cursor = start + token.length;
    return { nextValue, nextCursorStart: cursor, nextCursorEnd: cursor };
  }

  if (action === 'quote') {
    const target = selected || 'दिल की बात';
    const lines = target
      .split('\n')
      .map((line) => (line.startsWith('> ') ? line : `> ${line}`))
      .join('\n');
    const nextValue = value.slice(0, start) + lines + value.slice(end);
    return {
      nextValue,
      nextCursorStart: start,
      nextCursorEnd: start + lines.length,
    };
  }

  const marker = action === 'bold' ? '**' : '*';
  const placeholder = action === 'bold' ? 'ख़ास शब्द' : 'भाव';
  const inner = selected || placeholder;
  const wrapped = `${marker}${inner}${marker}`;
  const nextValue = value.slice(0, start) + wrapped + value.slice(end);

  if (selected) {
    const cursor = start + wrapped.length;
    return { nextValue, nextCursorStart: cursor, nextCursorEnd: cursor };
  }
  return {
    nextValue,
    nextCursorStart: start + marker.length,
    nextCursorEnd: start + marker.length + placeholder.length,
  };
}

export function insertAtCursor(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  snippet: string
): { nextValue: string; nextCursor: number } {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));
  const nextValue = value.slice(0, start) + snippet + value.slice(end);
  return {
    nextValue,
    nextCursor: start + snippet.length,
  };
}

/**
 * Parses a single line of Shayari text into bold/italic/quote spans safely (no HTML injection).
 */
export function parseRichShayariLine(line: string): RichTextSegment[] {
  const trimmedStart = line.trimStart();
  if (trimmedStart.startsWith('> ')) {
    return [{ type: 'quote', content: trimmedStart.slice(2) }];
  }

  const segments: RichTextSegment[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: line.slice(lastIndex, match.index),
      });
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      segments.push({ type: 'bold', content: token.slice(2, -2) });
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      segments.push({ type: 'italic', content: token.slice(1, -1) });
    } else {
      segments.push({ type: 'text', content: token });
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < line.length) {
    segments.push({ type: 'text', content: line.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', content: '' });
  }
  return segments;
}

export function stripRichFormatting(text: string): string {
  return text
    .replace(/^>\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
}
