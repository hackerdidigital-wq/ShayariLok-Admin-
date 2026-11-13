import React, { useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import type { ShayariLokConfig } from '../types/config';
import { encodeUtf8Base64, getUtf8ByteLength } from '../utils/base64';
import { serializeConfigJson } from '../utils/configHelpers';

interface JsonPreviewModalProps {
  open: boolean;
  onClose: () => void;
  config: ShayariLokConfig;
  unsaved: boolean;
  currentSha: string;
}

export const JsonPreviewModal: React.FC<JsonPreviewModalProps> = ({
  open,
  onClose,
  config,
  unsaved,
  currentSha,
}) => {
  const [viewMode, setViewMode] = useState<'json' | 'base64'>('json');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const jsonString = serializeConfigJson(config);
  const byteSize = getUtf8ByteLength(jsonString);
  const outputContent =
    viewMode === 'json' ? jsonString : encodeUtf8Base64(jsonString + '\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString + '\n'], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'config.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="json-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
    >
      <div className="w-full max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="json-preview-title"
              className="font-display text-base font-semibold text-slate-900"
            >
              Live config.json Preview
            </h2>
            <div className="mt-0.5 text-xs text-slate-500 flex flex-wrap items-center gap-2 font-mono tabular-nums">
              <span>{byteSize.toLocaleString()} bytes UTF-8</span>
              <span aria-hidden="true">·</span>
              <span>{config.shayari_list.length} shayaris</span>
              <span aria-hidden="true">·</span>
              <span>
                {unsaved ? 'Unsaved changes pending' : 'Matches baseline'}
              </span>
              {currentSha && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>SHA {currentSha.slice(0, 7)}</span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close JSON preview"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'json'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Formatted JSON
            </button>
            <button
              type="button"
              onClick={() => setViewMode('base64')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'base64'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              UTF-8 Base64 Payload
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .json</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-950 p-5">
          <pre className="font-mono text-xs leading-relaxed text-slate-100 whitespace-pre-wrap break-all">
            {outputContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
