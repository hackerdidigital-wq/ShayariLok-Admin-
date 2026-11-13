import React, { useMemo, useState } from 'react';
import {
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { ShayariItem, ShayariLokConfig } from '../types/config';
import {
  ensureAllFirstCategory,
  filterShayaris,
  getNextId,
} from '../utils/configHelpers';

interface ShayariManagerSectionProps {
  config: ShayariLokConfig;
  onUpdate: (patch: Partial<ShayariLokConfig>) => void;
}

export const ShayariManagerSection: React.FC<ShayariManagerSectionProps> = ({
  config,
  onUpdate,
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
  const [formError, setFormError] = useState<string>('');

  const nextAutoId = useMemo(
    () => getNextId(config.shayari_list),
    [config.shayari_list]
  );

  const filteredList = useMemo(
    () => filterShayaris(config.shayari_list, selectedCategory, searchQuery),
    [config.shayari_list, selectedCategory, searchQuery]
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
    setFormError('');
    if (!assignableCategories.includes(formCategory)) {
      setFormCategory(assignableCategories[0] ?? 'Love');
    }
  };

  const handleSubmitShayari = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedText = formText.trim();
    if (!cleanedText) {
      setFormError('कृपया शायरी का टेक्स्ट लिखें।');
      return;
    }

    const targetCategory = formCategory.trim() || assignableCategories[0] || 'Love';
    const targetAuthor = formAuthor.trim() || 'अज्ञात';

    if (editingId !== null) {
      const updated = config.shayari_list.map((item) =>
        item.id === editingId
          ? {
              ...item,
              category: targetCategory,
              text: formText.replace(/\r\n/g, '\n').trim(),
              author: targetAuthor,
            }
          : item
      );
      onUpdate({ shayari_list: updated });
      resetForm();
      return;
    }

    const newItem: ShayariItem = {
      id: nextAutoId,
      category: targetCategory,
      text: formText.replace(/\r\n/g, '\n').trim(),
      author: targetAuthor,
    };

    onUpdate({ shayari_list: [newItem, ...config.shayari_list] });
    setFormText('');
    setFormAuthor('');
    setFormError('');
  };

  const handleStartEdit = (item: ShayariItem) => {
    setEditingId(item.id);
    setFormCategory(item.category);
    setFormText(item.text);
    setFormAuthor(item.author);
    setFormError('');
  };

  const handleDeleteShayari = (id: number) => {
    const updated = config.shayari_list.filter((item) => item.id !== id);
    onUpdate({ shayari_list: updated });
    if (editingId === id) {
      resetForm();
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Add / Edit Shayari Form */}
        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                {editingId !== null
                  ? `Edit Shayari #${editingId}`
                  : 'Add New Shayari'}
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
                Category
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
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="shayari-text-input"
                  className="block text-sm font-medium text-slate-700"
                >
                  Shayari Text (Hindi / Hinglish, Multi-line)
                </label>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {formText.length} chars
                </span>
              </div>
              <textarea
                id="shayari-text-input"
                rows={4}
                value={formText}
                onChange={(e) => {
                  setFormText(e.target.value);
                  if (formError) setFormError('');
                }}
                placeholder={'दिल की बात लफ़्ज़ों में बयाँ हो गई,\nख़ामोशी ही हमारी जुबां हो गई।'}
                className="w-full px-3.5 py-2.5 text-sm leading-relaxed bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
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

            {formError && (
              <div
                role="alert"
                className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>
                {editingId !== null ? 'Update Shayari' : 'Add Shayari to List'}
              </span>
            </button>
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
              {filteredList.map((item) => (
                <article
                  key={item.id}
                  className={`p-4 transition-colors ${
                    editingId === item.id ? 'bg-indigo-50/50' : 'bg-white hover:bg-slate-50/70'
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
                      </div>
                      <p className="text-sm sm:text-[15px] leading-relaxed text-slate-900 whitespace-pre-line">
                        {item.text}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
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
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
