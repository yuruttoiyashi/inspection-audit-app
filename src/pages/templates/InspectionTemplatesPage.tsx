import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type InspectionTemplate = {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  name: string;
  category: string;
  is_active: boolean;
};

type StatusFilter = 'all' | 'active' | 'inactive';

const initialFormState: FormState = {
  name: '',
  category: '',
  is_active: true,
};

export default function InspectionTemplatesPage() {
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('inspection_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setTemplates([]);
      setMessage('点検テンプレートの取得に失敗しました。');
      setMessageType('error');
    } else {
      setTemplates(data ?? []);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormState(initialFormState);
    setEditingId(null);
  };

  const handleEdit = (template: InspectionTemplate) => {
    setEditingId(template.id);
    setFormState({
      name: template.name ?? '',
      category: template.category ?? '',
      is_active: template.is_active,
    });
    setMessage('');
    setMessageType('');
  };

  const handleCancelEdit = () => {
    resetForm();
    setMessage('');
    setMessageType('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setMessageType('');

    if (!formState.name.trim()) {
      setMessage('テンプレート名は必須です。');
      setMessageType('error');
      setSubmitting(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('inspection_templates')
        .update({
          name: formState.name.trim(),
          category: formState.category.trim() || null,
          is_active: formState.is_active,
        })
        .eq('id', editingId);

      if (error) {
        setMessage('点検テンプレートの更新に失敗しました。');
        setMessageType('error');
      } else {
        setMessage('点検テンプレートを更新しました。');
        setMessageType('success');
        resetForm();
        await fetchTemplates();
      }
    } else {
      const { error } = await supabase.from('inspection_templates').insert([
        {
          name: formState.name.trim(),
          category: formState.category.trim() || null,
          is_active: formState.is_active,
        },
      ]);

      if (error) {
        setMessage('点検テンプレートの登録に失敗しました。');
        setMessageType('error');
      } else {
        setMessage('点検テンプレートを登録しました。');
        setMessageType('success');
        resetForm();
        await fetchTemplates();
      }
    }

    setSubmitting(false);
  };

  const handleToggleActive = async (template: InspectionTemplate) => {
    setTogglingId(template.id);
    setMessage('');
    setMessageType('');

    const nextIsActive = !template.is_active;

    const { error } = await supabase
      .from('inspection_templates')
      .update({
        is_active: nextIsActive,
      })
      .eq('id', template.id);

    if (error) {
      setMessage('有効 / 無効の切り替えに失敗しました。');
      setMessageType('error');
    } else {
      setTemplates((prev) =>
        prev.map((item) =>
          item.id === template.id
            ? {
                ...item,
                is_active: nextIsActive,
              }
            : item
        )
      );

      if (editingId === template.id) {
        setFormState((prev) => ({
          ...prev,
          is_active: nextIsActive,
        }));
      }

      setMessage(
        nextIsActive
          ? '点検テンプレートを有効にしました。'
          : '点検テンプレートを無効にしました。'
      );
      setMessageType('success');
    }

    setTogglingId(null);
  };

  const formatDateTime = (value: string) => {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('ja-JP');
  };

  const categoryOptions = useMemo(() => {
    const categories = templates
      .map((template) => template.category?.trim())
      .filter((value): value is string => !!value);

    return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesKeyword =
        normalizedKeyword === '' ||
        [template.name, template.category ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && template.is_active) ||
        (statusFilter === 'inactive' && !template.is_active);

      const matchesCategory =
        categoryFilter === 'all' || (template.category ?? '') === categoryFilter;

      return matchesKeyword && matchesStatus && matchesCategory;
    });
  }, [templates, keyword, statusFilter, categoryFilter]);

  const clearFilters = () => {
    setKeyword('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">点検テンプレート管理</h1>
        <p className="mt-1 text-sm text-slate-600">
          点検テンプレートの登録・編集・有効/無効の管理を行います。
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            messageType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">
            {editingId ? '点検テンプレートを編集' : '新規登録'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {editingId
              ? '選択中の点検テンプレートを更新できます。'
              : 'まずはMVPとして、点検テンプレートの基本情報を登録します。'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                テンプレート名 <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="例: 消火器月次点検"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                カテゴリ
              </label>
              <input
                id="category"
                type="text"
                value={formState.category}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                placeholder="例: 消火設備 / フォークリフト / 空調"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formState.is_active}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              有効な点検テンプレートとして登録する
            </label>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? editingId
                    ? '更新中...'
                    : '登録中...'
                  : editingId
                    ? '点検テンプレートを更新'
                    : '点検テンプレートを登録'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  キャンセル
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">点検テンプレート一覧</h2>
              <p className="mt-2 text-sm text-slate-500">
                登録済みの点検テンプレートを確認できます。
              </p>
            </div>

            <div className="text-sm text-slate-500">
              {loading
                ? '読み込み中...'
                : `${filteredTemplates.length}件表示中 / 全${templates.length}件`}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600">
                キーワード検索
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="テンプレート名 / カテゴリで検索"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600">
                状態
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">すべて</option>
                <option value="active">有効</option>
                <option value="inactive">無効</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600">
                カテゴリ
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">すべて</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 xl:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                絞り込みをクリア
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">
                読み込み中...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                条件に一致する点検テンプレートはありません。
              </div>
            ) : (
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-3 py-3 font-semibold">テンプレート名</th>
                    <th className="px-3 py-3 font-semibold">カテゴリ</th>
                    <th className="px-3 py-3 font-semibold">状態</th>
                    <th className="px-3 py-3 font-semibold">登録日時</th>
                    <th className="px-3 py-3 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTemplates.map((template) => (
                    <tr
                      key={template.id}
                      className="border-b border-slate-100 text-slate-700"
                    >
                      <td className="px-3 py-4 font-semibold text-slate-900">
                        {template.name}
                      </td>
                      <td className="px-3 py-4">{template.category || '-'}</td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            template.is_active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {template.is_active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        {formatDateTime(template.created_at)}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(template)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            編集
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(template)}
                            disabled={togglingId === template.id}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              template.is_active
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            {togglingId === template.id
                              ? '更新中...'
                              : template.is_active
                                ? '無効化'
                                : '有効化'}
                          </button>

                          <Link
                            to={`/templates/${template.id}/items`}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            項目管理
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}