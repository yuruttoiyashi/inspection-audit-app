import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type InspectionTemplate = {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type InspectionTemplateItem = {
  id: string;
  template_id: string;
  item_name: string;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  updated_at: string;
};

type FormState = {
  item_name: string;
  sort_order: number;
  is_required: boolean;
};

const initialFormState: FormState = {
  item_name: '',
  sort_order: 1,
  is_required: true,
};

export default function InspectionTemplateItemsPage() {
  const { templateId } = useParams<{ templateId: string }>();

  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [items, setItems] = useState<InspectionTemplateItem[]>([]);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const nextSortOrder = useMemo(() => {
    if (items.length === 0) return 1;
    return Math.max(...items.map((item) => item.sort_order || 0)) + 1;
  }, [items]);

  useEffect(() => {
    if (!templateId) {
      setLoading(false);
      setMessage('テンプレートIDが指定されていません。');
      setMessageType('error');
      return;
    }

    fetchPageData();
  }, [templateId]);

  useEffect(() => {
    if (!editingId) {
      setFormState((prev) => ({
        ...prev,
        sort_order: nextSortOrder,
      }));
    }
  }, [nextSortOrder, editingId]);

  const fetchPageData = async () => {
    if (!templateId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    const [templateResult, itemsResult] = await Promise.all([
      supabase
        .from('inspection_templates')
        .select('*')
        .eq('id', templateId)
        .single(),
      supabase
        .from('inspection_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);

    if (templateResult.error) {
      setTemplate(null);
      setMessage(`点検テンプレートの取得に失敗しました。${templateResult.error.message}`);
      setMessageType('error');
    } else {
      setTemplate(templateResult.data);
    }

    if (itemsResult.error) {
      setItems([]);
      setMessage(`点検項目の取得に失敗しました。${itemsResult.error.message}`);
      setMessageType('error');
    } else {
      setItems(itemsResult.data ?? []);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setFormState({
      item_name: '',
      sort_order: nextSortOrder,
      is_required: true,
    });
    setEditingId(null);
  };

  const handleEdit = (item: InspectionTemplateItem) => {
    setEditingId(item.id);
    setFormState({
      item_name: item.item_name,
      sort_order: item.sort_order,
      is_required: item.is_required,
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

    if (!templateId) {
      setMessage('テンプレートIDが取得できません。');
      setMessageType('error');
      return;
    }

    if (!formState.item_name.trim()) {
      setMessage('点検項目名は必須です。');
      setMessageType('error');
      return;
    }

    if (!Number.isInteger(formState.sort_order) || formState.sort_order <= 0) {
      setMessage('表示順は1以上の整数で入力してください。');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    setMessage('');
    setMessageType('');

    if (editingId) {
      const { error } = await supabase
        .from('inspection_template_items')
        .update({
          item_name: formState.item_name.trim(),
          sort_order: formState.sort_order,
          is_required: formState.is_required,
        })
        .eq('id', editingId);

      if (error) {
        setMessage(`点検項目の更新に失敗しました。${error.message}`);
        setMessageType('error');
      } else {
        setMessage('点検項目を更新しました。');
        setMessageType('success');
        resetForm();
        await fetchPageData();
      }
    } else {
      const { error } = await supabase.from('inspection_template_items').insert([
        {
          template_id: templateId,
          item_name: formState.item_name.trim(),
          sort_order: formState.sort_order,
          is_required: formState.is_required,
        },
      ]);

      if (error) {
        setMessage(`点検項目の登録に失敗しました。${error.message}`);
        setMessageType('error');
      } else {
        setMessage('点検項目を登録しました。');
        setMessageType('success');
        resetForm();
        await fetchPageData();
      }
    }

    setSubmitting(false);
  };

  const handleDelete = async (item: InspectionTemplateItem) => {
    const confirmed = window.confirm(`「${item.item_name}」を削除しますか？`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setMessage('');
    setMessageType('');

    const { error } = await supabase
      .from('inspection_template_items')
      .delete()
      .eq('id', item.id);

    if (error) {
      setMessage(`点検項目の削除に失敗しました。${error.message}`);
      setMessageType('error');
    } else {
      setMessage('点検項目を削除しました。');
      setMessageType('success');

      if (editingId === item.id) {
        resetForm();
      }

      await fetchPageData();
    }

    setDeletingId(null);
  };

  const formatDateTime = (value: string) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('ja-JP');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2">
            <Link
              to="/templates"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              ← テンプレート一覧に戻る
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">点検テンプレート項目管理</h1>
          <p className="mt-1 text-sm text-slate-600">
            テンプレートに紐づく点検項目を登録・編集・削除します。
          </p>
        </div>

        {template && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
            <div className="font-semibold text-slate-900">{template.name}</div>
            <div className="mt-1 text-slate-500">
              カテゴリ: {template.category || '-'}
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                  template.is_active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {template.is_active ? '有効' : '無効'}
              </span>
            </div>
          </div>
        )}
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
            {editingId ? '点検項目を編集' : '新規登録'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {editingId
              ? '選択中の点検項目を更新できます。'
              : 'テンプレートに紐づく点検項目を追加します。'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="item_name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                点検項目名 <span className="text-rose-500">*</span>
              </label>
              <input
                id="item_name"
                type="text"
                value={formState.item_name}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    item_name: e.target.value,
                  }))
                }
                placeholder="例: 外観に異常がないこと"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label
                htmlFor="sort_order"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                表示順
              </label>
              <input
                id="sort_order"
                type="number"
                min={1}
                value={formState.sort_order}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    sort_order: Number(e.target.value) || 1,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formState.is_required}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    is_required: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
              />
              必須項目として登録する
            </label>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting || !template}
                className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? editingId
                    ? '更新中...'
                    : '登録中...'
                  : editingId
                    ? '点検項目を更新'
                    : '点検項目を登録'}
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
              <h2 className="text-xl font-semibold text-slate-900">点検項目一覧</h2>
              <p className="mt-2 text-sm text-slate-500">
                登録済みの点検項目を確認できます。
              </p>
            </div>

            <div className="text-sm text-slate-500">
              {loading ? '読み込み中...' : `${items.length}件`}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">
                読み込み中...
              </div>
            ) : !template ? (
              <div className="py-10 text-center text-sm text-slate-500">
                テンプレート情報を取得できませんでした。
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                点検項目はまだ登録されていません。
              </div>
            ) : (
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-3 py-3 font-semibold">表示順</th>
                    <th className="px-3 py-3 font-semibold">点検項目名</th>
                    <th className="px-3 py-3 font-semibold">必須</th>
                    <th className="px-3 py-3 font-semibold">登録日時</th>
                    <th className="px-3 py-3 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 text-slate-700"
                    >
                      <td className="px-3 py-4">{item.sort_order}</td>
                      <td className="px-3 py-4 font-semibold text-slate-900">
                        {item.item_name}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            item.is_required
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.is_required ? '必須' : '任意'}
                        </span>
                      </td>
                      <td className="px-3 py-4">{formatDateTime(item.created_at)}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            編集
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === item.id ? '削除中...' : '削除'}
                          </button>
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