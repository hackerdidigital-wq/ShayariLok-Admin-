/**
 * UTF-8 safe Base64 encoder & decoder for Hindi (Devanagari), Hinglish,
 * emojis, and multi-line strings used with the GitHub Contents API.
 */
export function encodeUtf8Base64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function decodeUtf8Base64(base64Input: string): string {
  // GitHub Contents API wraps base64 lines every 60 characters with \n
  const cleanBase64 = base64Input.replace(/\s+/g, '');
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

export function getUtf8ByteLength(input: string): number {
  return new TextEncoder().encode(input).length;
}
