import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Check,
  Copy,
  FolderPlus,
  GitBranch,
  Image as ImageIcon,
  Italic,
  Loader2,
  Pencil,
  Plus,
  Quote,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type {
  GitHubSettings,
  ProxyAttemptLog,
  ProxySettings,
  ShayariItem,
  ShayariLokConfig,
} from '../types/config';
import { copyTextWithFeedback } from '../utils/clipboardToast';
import {
  ensureAllFirstCategory,
  filterShayaris,
  getNextId,
} from '../utils/configHelpers';
import {
  isGitHubConfigured,
  uploadImageToGitHub,
} from '../utils/githubApi';
import {
  buildGitHubImageRepoPath,
  compressImageFileToBase64,
  type CompressedImageResult,
} from '../utils/imageUpload';
import {
  QUICK_CATEGORY_PRESETS,
  SHAYARI_ORNAMENTS,
  applyMarkdownWrap,
  insertAtCursor,
  parseRichShayariLine,
  type RichFormatAction,
} from '../utils/richTextShayari';

interface ShayariManagerSectionProps {
  config: ShayariLokConfig;
  onUpdate: (patch: Partial<ShayariLokConfig>, instantSync?: boolean) => void;
  githubSettings: GitHubSettings;
  proxySettings: ProxySettings;
  onAttemptLog?: (log: ProxyAttemptLog) => void;
  onOpenGitHubSync: () => void;
  onPublishConfigNow?: (nextConfig: ShayariLokConfig) => Promise<void>;
}

export const ShayariManagerSection: React.FC<ShayariManagerSectionProps> = ({
  config,
  onUpdate,
  githubSettings,
  proxySettings,
  onAttemptLog,
  onOpenGitHubSync,
  onPublishConfigNow,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const assignableCategories = useMemo(
    () => config.categories.filter((c) => c !== 'All'),
    [config.categories]
  );

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formCategory, setFormCategory] = useState<string>(
    assignableCategories[0] ?? 'Love'
  );
  const [formText, setFormText] = useState<string>('');
  const [formAuthor, setFormAuthor] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [urlPreference, setUrlPreference] = useState<'jsdelivr' | 'raw'>(
    'jsdelivr'
  );
  const [stagedImage, setStagedImage] = useState<CompressedImageResult | null>(
    null
  );
  const [stagedFileName, setStagedFileName] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [publishingConfig, setPublishingConfig] = useState<boolean>(false);
  const [imageFeedback, setImageFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState<number>(25);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (
      assignableCategories.length > 0 &&
      !assignableCategories.includes(formCategory)
    ) {
      setFormCategory(assignableCategories[0]);
    }
  }, [assignableCategories, formCategory]);

  const nextAutoId = useMemo(
    () => getNextId(config.shayari_list),
    [config.shayari_list]
  );

  const githubWriteReady = useMemo(
    () => isGitHubConfigured(githubSettings, true),
    [githubSettings]
  );

  const filteredList = useMemo(
    () => filterShayaris(config.shayari_list, selectedCategory, searchQuery),
    [config.shayari_list, selectedCategory, searchQuery]
  );

  const visibleShayaris = useMemo(
    () => filteredList.slice(0, visibleLimit),
    [filteredList, visibleLimit]
  );

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set('All', config.shayari_list.length);
    for (const s of config.shayari_list) {
      map.set(s.category, (map.get(s.category) ?? 0) + 1);
    }
    return map;
  }, [config.shayari_list]);

  const resetForm = () => {
    setEditingId(null);
    setFormText('');
    setFormAuthor('');
    setFormImageUrl('');
    setStagedImage(null);
    setStagedFileName('');
    setImageFeedback(null);
    setFormError('');
    if (!assignableCategories.includes(formCategory)) {
      setFormCategory(assignableCategories[0] ?? 'Love');
    }
  };

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageFeedback(null);
    setFormError('');
    try {
      const compressed = await compressImageFileToBase64(file);
      setStagedImage(compressed);
      setStagedFileName(file.name);
      setImageFeedback({
        type: 'info',
        text: `फोटो तैयार है (${compressed.width}×${compressed.height}px, ${(compressed.byteSize / 1024).toFixed(1)} KB)। अब "Upload Photo to GitHub" या "Save & Publish" दबाएँ।`,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'गैलरी से फोटो लोड नहीं हो सकी।';
      setImageFeedback({ type: 'error', text: msg });
    }
  };

  const uploadStagedPhotoNow = async (
    targetShayariId: number
  ): Promise<string> => {
    if (!stagedImage) return formImageUrl.trim();
    if (!githubWriteReady) {
      throw new Error(
        'GitHub पर फोटो अपलोड करने के लिए पहले "GitHub Sync & Auth" में Owner, Repo और PAT सेव करें।'
      );
    }
    setUploadingImage(true);
    try {
      const repoPath = buildGitHubImageRepoPath(
        targetShayariId,
        stagedImage.ext,
        Date.now(),
        githubSettings.path
      );
      const uploaded = await uploadImageToGitHub(
        githubSettings,
        repoPath,
        stagedImage.base64,
        `Upload gallery photo for Shayari #${targetShayariId}`,
        proxySettings,
        onAttemptLog
      );
      const chosenUrl =
        urlPreference === 'raw' ? uploaded.rawUrl : uploaded.jsdelivrUrl;
      setFormImageUrl(chosenUrl);
      setStagedImage(null);
      setStagedFileName('');
      setImageFeedback({
        type: 'success',
        text: `फोटो GitHub (${uploaded.repoPath}) पर अपलोड हो गई और URL जुड़ गया!`,
      });
      return chosenUrl;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUploadOnly = async () => {
    if (!stagedImage) return;
    setFormError('');
    try {
      await uploadStagedPhotoNow(editingId ?? nextAutoId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'GitHub इमेज अपलोड विफल रहा।';
      setImageFeedback({ type: 'error', text: msg });
    }
  };

  const buildNextShayariList = (resolvedImageUrl: string): ShayariItem[] => {
    const targetCategory =
      formCategory.trim() || assignableCategories[0] || 'Love';
    const targetAuthor = formAuthor.trim() || 'अज्ञात';
    const cleanedText = formText.replace(/\r\n/g, '\n').trim();

    if (editingId !== null) {
      return config.shayari_list.map((item) =>
        item.id === editingId
          ? {
              ...item,
              category: targetCategory,
              text: cleanedText,
              author: targetAuthor,
              image_url: resolvedImageUrl,
            }
          : item
      );
    }

    const newItem: ShayariItem = {
      id: nextAutoId,
      category: targetCategory,
      text: cleanedText,
      author: targetAuthor,
      image_url: resolvedImageUrl,
    };
    return [newItem, ...config.shayari_list];
  };

  const handleSaveShayari = async (publishToGitHubAfterSave: boolean) => {
    const cleanedText = formText.trim();
    if (!cleanedText) {
      setFormError('कृपया शायरी का टेक्स्ट लिखें।');
      return;
    }

    setFormError('');
    let resolvedImageUrl = formImageUrl.trim();

    if (stagedImage) {
      if (githubWriteReady) {
        try {
          resolvedImageUrl = await uploadStagedPhotoNow(editingId ?? nextAutoId);
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : 'GitHub पर फोटो अपलोड नहीं हो सकी।';
          setImageFeedback({ type: 'error', text: msg });
          return;
        }
      } else {
        setImageFeedback({
          type: 'error',
          text: 'चुनी गई फोटो GitHub पर अपलोड करने के लिए पहले "GitHub Sync & Auth" में Repo व PAT जोड़ें (या नीचे सीधे Image URL पेस्ट करें)।',
        });
        return;
      }
    }

    const updatedList = buildNextShayariList(resolvedImageUrl);
    onUpdate({ shayari_list: updatedList }, true);

    if (publishToGitHubAfterSave && onPublishConfigNow) {
      setPublishingConfig(true);
      try {
        await onPublishConfigNow({ ...config, shayari_list: updatedList });
      } finally {
        setPublishingConfig(false);
      }
    }

    resetForm();
  };

  const handleApplyRichFormat = (action: RichFormatAction) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? formText.length;
    const end = el?.selectionEnd ?? formText.length;
    const { nextValue, nextCursorStart, nextCursorEnd } = applyMarkdownWrap(
      formText,
      start,
      end,
      action
    );
    setFormText(nextValue);
    if (formError) setFormError('');
    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursorStart, nextCursorEnd);
    });
  };

  const handleInsertOrnament = (token: string) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? formText.length;
    const end = el?.selectionEnd ?? formText.length;
    const { nextValue, nextCursor } = insertAtCursor(formText, start, end, token);
    setFormText(nextValue);
    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleQuickAddPresetCategory = (preset: string) => {
    if (
      config.categories.some((c) => c.toLowerCase() === preset.toLowerCase())
    ) {
      setFormCategory(preset);
      return;
    }
    const updated = ensureAllFirstCategory([...config.categories, preset]);
    onUpdate({ categories: updated }, true);
    setFormCategory(preset);
    setCategoryError('');
  };

  const handleSubmitShayari = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSaveShayari(false);
  };

  const handleStartEdit = (item: ShayariItem) => {
    setEditingId(item.id);
    setFormCategory(item.category);
    setFormText(item.text);
    setFormAuthor(item.author);
    setFormImageUrl(item.image_url || '');
    setStagedImage(null);
    setStagedFileName('');
    setImageFeedback(null);
    setFormError('');
  };

  const handleDeleteShayari = (id: number) => {
    const updated = config.shayari_list.filter((item) => item.id !== id);
    onUpdate({ shayari_list: updated }, true);
    if (editingId === id) {
      resetForm();
    }
  };

  const handleCopyItem = async (tag: string, text: string, label: string) => {
    const ok = await copyTextWithFeedback(text, label);
    if (ok) {
      setCopiedId(tag);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === tag ? null : prev));
      }, 2000);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryError('कैटेगरी का नाम खाली नहीं हो सकता।');
      return;
    }
    if (
      config.categories.some(
        (c) => c.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setCategoryError('यह कैटेगरी पहले से मौजूद है।');
      return;
    }
    const updatedCategories = ensureAllFirstCategory([
      ...config.categories,
      trimmed,
    ]);
    onUpdate({ categories: updatedCategories });
    setNewCategoryName('');
    setCategoryError('');
    setFormCategory(trimmed);
  };

  const handleDeleteCategory = (cat: string) => {
    if (cat === 'All') return;
    const remaining = config.categories.filter((c) => c !== cat);
    const updatedCategories = ensureAllFirstCategory(remaining);
    const fallbackCategory =
      updatedCategories.find((c) => c !== 'All') ?? 'General';
    const finalCategories =
      updatedCategories.length === 1
        ? ['All', 'General']
        : updatedCategories;

    const updatedShayaris = config.shayari_list.map((item) =>
      item.category === cat ? { ...item, category: fallbackCategory } : item
    );

    onUpdate({
      categories: finalCategories,
      shayari_list: updatedShayaris,
    });

    if (selectedCategory === cat) {
      setSelectedCategory('All');
    }
    if (formCategory === cat) {
      setFormCategory(fallbackCategory);
    }
  };

  const previewImageSrc = stagedImage?.previewDataUrl || formImageUrl.trim();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Add / Edit Shayari + Gallery Image Picker Form */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                {editingId !== null
                  ? `Edit Shayari #${editingId}`
                  : 'Add New Shayari & Gallery Photo'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {editingId !== null
                  ? `Updating ID #${editingId}`
                  : `Auto-assigned ID: #${nextAutoId}`}
              </p>
            </div>
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitShayari} className="space-y-4">
            <div>
              <label
                htmlFor="shayari-category-select"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Topic / Category
              </label>
              <select
                id="shayari-category-select"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {assignableCategories.length === 0 ? (
                  <option value="Love">Love</option>
                ) : (
                  assignableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="shayari-text-input"
                  className="block text-sm font-medium text-slate-700"
                >
                  Rich-Text Shayari Editor (Hindi / Hinglish)
                </label>
                <span className="font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                  {formText.length} chars · {formText ? formText.split('\n').length : 0} lines
                </span>
              </div>

              {/* Rich-Text Toolbar */}
              <div
                role="toolbar"
                aria-label="Shayari text formatting"
                className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-50 border border-b-0 border-slate-200 rounded-t-lg"
              >
                <button
                  type="button"
                  onClick={() => handleApplyRichFormat('bold')}
                  aria-label="Format bold"
                  title="Bold (**text**)"
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span>Bold</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyRichFormat('italic')}
                  aria-label="Format italic"
                  title="Italic (*text*)"
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100"
                >
                  <Italic className="w-3.5 h-3.5" />
                  <span>Italic</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyRichFormat('quote')}
                  aria-label="Format quote"
                  title="Highlight Quote (> line)"
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100"
                >
                  <Quote className="w-3.5 h-3.5" />
                  <span>Quote</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyRichFormat('sparkle')}
                  aria-label="Highlight with sparkles"
                  title="Sparkle highlight"
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>

                <span className="h-4 w-px bg-slate-200 mx-0.5" aria-hidden="true" />

                {SHAYARI_ORNAMENTS.map((orn) => (
                  <button
                    key={orn.label}
                    type="button"
                    onClick={() => handleInsertOrnament(orn.token)}
                    title={`Insert ${orn.label}`}
                    aria-label={`Insert ${orn.label}`}
                    className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded hover:bg-slate-100"
                  >
                    {orn.label === 'Divider' ? '✦' : orn.token}
                  </button>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                id="shayari-text-input"
                rows={4}
                value={formText}
                onChange={(e) => {
                  setFormText(e.target.value);
                  if (formError) setFormError('');
                }}
                placeholder={'दिल की बात लफ़्ज़ों में बयाँ हो गई,\nख़ामोशी ही हमारी जुबां हो गई।'}
                className="w-full px-3.5 py-2.5 text-sm leading-relaxed bg-white border border-slate-200 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />

              {formText.trim() && (
                <div className="mt-2 p-3 rounded-lg bg-slate-950 text-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-indigo-300">
                    <span>LIVE CARD PREVIEW · {formCategory}</span>
                    <span>— {formAuthor.trim() || 'अज्ञात'}</span>
                  </div>
                  <div className="text-xs sm:text-sm leading-relaxed space-y-0.5">
                    {formText.split('\n').map((line, lIdx) => {
                      const segments = parseRichShayariLine(line);
                      return (
                        <p key={lIdx} className="min-h-[1rem]">
                          {segments.map((seg, sIdx) => {
                            if (seg.type === 'bold') {
                              return (
                                <strong key={sIdx} className="font-bold text-white">
                                  {seg.content}
                                </strong>
                              );
                            }
                            if (seg.type === 'italic') {
                              return (
                                <em key={sIdx} className="italic text-indigo-200">
                                  {seg.content}
                                </em>
                              );
                            }
                            if (seg.type === 'quote') {
                              return (
                                <span
                                  key={sIdx}
                                  className="block pl-2.5 border-l-2 border-indigo-400 text-indigo-100"
                                >
                                  {seg.content}
                                </span>
                              );
                            }
                            return <React.Fragment key={sIdx}>{seg.content}</React.Fragment>;
                          })}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="shayari-author-input"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Author / Shayar Name
              </label>
              <input
                id="shayari-author-input"
                type="text"
                value={formAuthor}
                onChange={(e) => setFormAuthor(e.target.value)}
                placeholder="अज्ञात / CyberKing"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Gallery Image Picker & GitHub Upload Panel */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Gallery Image Picker (config.json · image_url)</span>
                </div>

                <div className="flex items-center gap-1 text-[11px] bg-white border border-slate-200 rounded-md p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setUrlPreference('jsdelivr')}
                    className={`px-2 py-0.5 rounded font-medium whitespace-nowrap ${
                      urlPreference === 'jsdelivr'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    jsDelivr CDN
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrlPreference('raw')}
                    className={`px-2 py-0.5 rounded font-medium whitespace-nowrap ${
                      urlPreference === 'raw'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    GitHub Raw
                  </button>
                </div>
              </div>

              <input
                ref={imageInputRef}
                id="shayari-gallery-image-input"
                type="file"
                accept="image/*"
                onChange={(e) => void handlePickImage(e)}
                className="sr-only"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>गैलरी से फोटो चुनें (Image Picker)</span>
                </button>

                {stagedImage && (
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => void handleUploadOnly()}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {uploadingImage
                        ? 'Uploading...'
                        : 'Upload Photo to GitHub'}
                    </span>
                  </button>
                )}

                {(stagedImage || formImageUrl) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStagedImage(null);
                      setStagedFileName('');
                      setFormImageUrl('');
                      setImageFeedback(null);
                    }}
                    className="px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              {previewImageSrc && (
                <div className="flex items-center gap-3 p-2 bg-white border border-slate-200 rounded-lg">
                  <img
                    src={previewImageSrc}
                    alt="Selected Shayari preview"
                    className="w-16 h-16 rounded-md object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-xs font-semibold text-slate-800 truncate">
                      {stagedFileName || 'Attached Photo URL'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate">
                      {stagedImage
                        ? `Ready (${stagedImage.width}×${stagedImage.height}px · ${(stagedImage.byteSize / 1024).toFixed(1)} KB)`
                        : formImageUrl}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="shayari-image-url-input"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Image URL (Auto-filled after GitHub upload, or paste direct HTTPS URL)
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="shayari-image-url-input"
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://cdn.jsdelivr.net/gh/owner/repo@main/images/..."
                    className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  {formImageUrl.trim() && (
                    <button
                      type="button"
                      onClick={() =>
                        void handleCopyItem(
                          'form-img-url',
                          formImageUrl.trim(),
                          'Image URL'
                        )
                      }
                      aria-label="Copy image URL"
                      className="px-2.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 shrink-0"
                    >
                      {copiedId === 'form-img-url' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {!githubWriteReady && (
                <div className="flex items-center justify-between gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                  <span>
                    फोटो सीधे GitHub पर अपलोड करने के लिए Repo व PAT कनेक्ट करें।
                  </span>
                  <button
                    type="button"
                    onClick={onOpenGitHubSync}
                    className="flex items-center gap-1 font-semibold underline whitespace-nowrap shrink-0"
                  >
                    <GitBranch className="w-3 h-3" />
                    <span>Connect</span>
                  </button>
                </div>
              )}

              {imageFeedback && (
                <div
                  role="status"
                  className={`text-xs font-medium px-3 py-2 rounded-lg border ${
                    imageFeedback.type === 'error'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : imageFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                  }`}
                >
                  {imageFeedback.text}
                </div>
              )}
            </div>

            {formError && (
              <div
                role="alert"
                className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {formError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={uploadingImage || publishingConfig}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {editingId !== null
                    ? 'Update Shayari'
                    : 'Add Shayari to List'}
                </span>
              </button>

              {githubWriteReady && onPublishConfigNow && (
                <button
                  type="button"
                  disabled={uploadingImage || publishingConfig}
                  onClick={() => void handleSaveShayari(true)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  {publishingConfig ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {publishingConfig ? 'Publishing...' : 'Save & Publish JSON'}
                  </span>
                </button>
              )}
            </div>
          </form>

          {/* Category Manager Toggle */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Categories ({config.categories.length})
              </span>
              <button
                type="button"
                onClick={() => setShowCategoryManager((prev) => !prev)}
                aria-expanded={showCategoryManager}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>
                  {showCategoryManager ? 'Hide Manager' : 'Manage Categories'}
                </span>
              </button>
            </div>

            {showCategoryManager && (
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-slate-500">
                    Quick Add Popular Categories:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_CATEGORY_PRESETS.map((preset) => {
                      const exists = config.categories.some(
                        (c) => c.toLowerCase() === preset.toLowerCase()
                      );
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleQuickAddPresetCategory(preset)}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors ${
                            exists
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700'
                          }`}
                        >
                          {exists ? `✓ ${preset}` : `+ ${preset}`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input
                    type="text"
                    aria-label="New category name"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      if (categoryError) setCategoryError('');
                    }}
                    placeholder="e.g. Dosti, Bewafa, Good Morning"
                    className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    Add
                  </button>
                </form>

                {categoryError && (
                  <p className="text-xs text-red-700">{categoryError}</p>
                )}

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {config.categories.map((cat, idx) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400 tabular-nums">
                          {idx + 1}.
                        </span>
                        <span className="font-medium text-slate-800">{cat}</span>
                        <span className="text-slate-400 tabular-nums">
                          · {categoryCounts.get(cat) ?? 0} items
                        </span>
                      </div>
                      {cat === 'All' ? (
                        <span className="text-[11px] font-medium text-slate-400">
                          Locked first
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          aria-label={`Delete category ${cat}`}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Shayari Filter, Search & List */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Shayari Library ({filteredList.length})
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search shayari text, author, or ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shayari, author, #id..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Interactive Category Filter Segmented Bar */}
          <div
            role="tablist"
            aria-label="Filter shayaris by category"
            className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
          >
            {config.categories.map((cat) => {
              const active = selectedCategory === cat;
              const count = categoryCounts.get(cat) ?? 0;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    active
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Shayari Rows */}
          {filteredList.length === 0 ? (
            <div className="py-12 px-4 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <p className="text-sm font-medium text-slate-700">
                कोई शायरी नहीं मिली
              </p>
              <p className="text-xs text-slate-500">
                {searchQuery
                  ? 'सर्च टेक्स्ट बदलें या फ़िल्टर रीसेट करें।'
                  : 'बाएँ फ़ॉर्म से इस कैटेगरी में पहली शायरी जोड़ें।'}
              </p>
              {(searchQuery || selectedCategory !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="mt-2 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {visibleShayaris.map((item) => {
                const copyTextKey = `copy-sh-${item.id}`;
                const copyImgKey = `copy-img-${item.id}`;
                return (
                  <article
                    key={item.id}
                    className={`p-4 transition-colors ${
                      editingId === item.id
                        ? 'bg-indigo-50/50'
                        : 'bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-semibold text-indigo-700">
                            {item.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            ID #{item.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.author}</span>
                          {item.image_url && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                                Photo Attached
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm sm:text-[15px] leading-relaxed text-slate-900 whitespace-pre-line">
                          {item.text}
                        </p>

                        {item.image_url && (
                          <div className="pt-1 flex items-center gap-3">
                            <img
                              src={item.image_url}
                              alt={`Shayari #${item.id} photo`}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="w-16 h-12 rounded-md object-cover border border-slate-200 bg-slate-100 shrink-0"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                void handleCopyItem(
                                  copyImgKey,
                                  item.image_url || '',
                                  `Shayari #${item.id} Image URL`
                                )
                              }
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100"
                            >
                              {copiedId === copyImgKey ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-700" />
                                  <span className="text-emerald-700">
                                    Copied Successfully!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Image URL</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyItem(
                              copyTextKey,
                              `${item.text}\n\n— ${item.author}`,
                              `Shayari #${item.id}`
                            )
                          }
                          aria-label={`Copy Shayari #${item.id}`}
                          className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Copy Shayari"
                        >
                          {copiedId === copyTextKey ? (
                            <Check className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          aria-label={`Edit Shayari #${item.id}`}
                          className="p-2 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShayari(item.id)}
                          aria-label={`Delete Shayari #${item.id}`}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredList.length > visibleShayaris.length && (
                <div className="p-3 bg-slate-50 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((prev) => prev + 25)}
                    className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50"
                  >
                    Load More ({filteredList.length - visibleShayaris.length} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
