import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGitHubImageRepoPath,
  buildPublicGitHubImageUrls,
  validateImageFile,
} from './imageUpload';

test('validateImageFile accepts valid image types and rejects non-images or oversized files', () => {
  assert.deepEqual(
    validateImageFile({ type: 'image/jpeg', size: 120_000, name: 'photo.jpg' }),
    { ok: true }
  );
  assert.deepEqual(
    validateImageFile({ type: '', size: 42_000, name: 'shayari.webp' }),
    { ok: true }
  );
  assert.equal(
    validateImageFile({ type: 'application/pdf', size: 1024, name: 'doc.pdf' }).ok,
    false
  );
  assert.equal(
    validateImageFile({ type: 'image/png', size: 12 * 1024 * 1024, name: 'huge.png' }).ok,
    false
  );
});

test('buildGitHubImageRepoPath respects subdirectories and generates timestamped path', () => {
  assert.equal(
    buildGitHubImageRepoPath(7, 'jpg', 1700000000000, 'config.json'),
    'images/shayari-7-1700000000000.jpg'
  );
  assert.equal(
    buildGitHubImageRepoPath(12, 'png', 1700000000123, 'api/v1/config.json'),
    'api/v1/images/shayari-12-1700000000123.png'
  );
});

test('buildPublicGitHubImageUrls returns both GitHub Raw and jsDelivr CDN URLs', () => {
  const urls = buildPublicGitHubImageUrls(
    { owner: 'cyberking', repo: 'shayarilok-data', branch: 'main' },
    'images/shayari-7-1700000000000.jpg'
  );
  assert.equal(
    urls.rawUrl,
    'https://raw.githubusercontent.com/cyberking/shayarilok-data/main/images/shayari-7-1700000000000.jpg'
  );
  assert.equal(
    urls.jsdelivrUrl,
    'https://cdn.jsdelivr.net/gh/cyberking/shayarilok-data@main/images/shayari-7-1700000000000.jpg'
  );
});
