import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { normalizeRelation } from '../../lib/supabaseRelationHelpers';

type InspectionRow = {
  id: string;
  inspection_date: string;
  abnormal_flag: boolean;
  comment: string | null;
  abnormal_comment: string | null;
  target: {
    id: string;
    name: string;
  } | null;
  template: {
    id: string;
    name: string;
  } | null;
  inspector: {
    id: string;
    name: string | null;
  } | null;
};

type InspectionRowRaw = {
  id: string;
  inspection_date: string;
  abnormal_flag: boolean;
  comment: string | null;
  abnormal_comment: string | null;
  target: unknown;
  template: unknown;
  inspector: unknown;
};

type AbnormalFilter = 'all' | 'abnormal' | 'normal';

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<InspectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState('');
  const [abnormalFilter, setAbnormalFilter] = useState<AbnormalFilter>('all');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    void fetchInspections();
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    const { data, error } = await supabase
      .from('inspections')
      .select(
        `
        id,
        inspection_date,
        abnormal_flag,
        comment,
        abnormal_comment,
        target:inspection_targets!inspections_target_id_fkey (
          id,
          name
        ),
        template:inspection_templates!inspections_template_id_fkey (
          id,
          name
        ),
        inspector:profiles!inspections_inspector_id_fkey (
          id,
          name
        )
      `,
      )
      .order('inspection_date', { ascending: false })
      .order('id', { ascending: false });

    if (error) {
      console.error('inspections select error:', error);
      setInspections([]);
      setMessage(`点検実施一覧の取得に失敗しました。${error.message}`);
      setMessageType('error');
    } else {
      const inspectionRows = (data ?? []) as InspectionRowRaw[];

      const normalizedInspections: InspectionRow[] = inspectionRows.map((row) => ({
        id: row.id,
        inspection_date: row.inspection_date,
        abnormal_flag: row.abnormal_flag,
        comment: row.comment,
        abnormal_comment: row.abnormal_comment,
        target: normalizeRelation<{ id: string; name: string }>(row.target, {
          id: '',
          name: '未設定',
        }),
        template: normalizeRelation<{ id: string; name: string }>(row.template, {
          id: '',
          name: '未設定',
        }),
        inspector: normalizeRelation<{ id: string; name: string | null }>(row.inspector, {
          id: '',
          name: '不明',
        }),
      }));

      setInspections(normalizedInspections);
    }

    setLoading(false);
  };

  const filteredInspections = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return inspections.filter((inspection) => {
      const matchesKeyword =
        normalizedKeyword === '' ||
        [
          inspection.target?.name ?? '',
          inspection.template?.name ?? '',
          inspection.inspector?.name ?? '',
          inspection.comment ?? '',
          inspection.abnormal_comment ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword);

      const matchesAbnormal =
        abnormalFilter === 'all' ||
        (abnormalFilter === 'abnormal' && inspection.abnormal_flag) ||
        (abnormalFilter === 'normal' && !inspection.abnormal_flag);

      return matchesKeyword && matchesAbnormal;
    });
  }, [inspections, keyword, abnormalFilter]);

  const abnormalCount = useMemo(() => {
    return inspections.filter((inspection) => inspection.abnormal_flag).length;
  }, [inspections]);

  const clearFilters = () => {
    setKeyword('');
    setAbnormalFilter('all');
  };

  const formatDate = (value: string) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('ja-JP');
  };

  const shortenText = (value: string | null, maxLength = 28) => {
    if (!value) return '-';
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength)}...`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">点検実施一覧</h1>
          <p className="mt-1 text-sm text-slate-600">登録済みの点検結果を一覧で確認できます。</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to="/inspections/new"
            className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            新規点検を登録
          </Link>

          <button
            type="button"
            onClick={() => void fetchInspections()}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? '更新中...' : '最新情報に更新'}
          </button>
        </div>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">点検実施数</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? '-' : inspections.length}</p>
          <p className="mt-2 text-xs text-slate-500">登録済みの点検件数</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">異常あり件数</p>
          <p className="mt-3 text-3xl font-bold text-rose-600">{loading ? '-' : abnormalCount}</p>
          <p className="mt-2 text-xs text-slate-500">abnormal_flag = true の件数</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">正常件数</p>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {loading ? '-' : inspections.length - abnormalCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">異常なしで登録された件数</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">点検実施一覧</h2>
            <p className="mt-2 text-sm text-slate-500">
              点検対象・テンプレート・点検者・異常有無を確認できます。
            </p>
          </div>

          <div className="text-sm text-slate-500">
            {loading ? '読み込み中...' : `${filteredInspections.length}件表示中 / 全${inspections.length}件`}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600">
              キーワード検索
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="点検対象 / テンプレート / 点検者 / コメントで検索"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600">
              異常有無
            </label>
            <select
              value={abnormalFilter}
              onChange={(e) => setAbnormalFilter(e.target.value as AbnormalFilter)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">すべて</option>
              <option value="abnormal">異常あり</option>
              <option value="normal">異常なし</option>
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
            <div className="py-10 text-center text-sm text-slate-500">読み込み中...</div>
          ) : filteredInspections.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              まだ点検実施データがありません。
            </div>
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="px-3 py-3 font-semibold">点検日</th>
                  <th className="px-3 py-3 font-semibold">点検対象</th>
                  <th className="px-3 py-3 font-semibold">テンプレート</th>
                  <th className="px-3 py-3 font-semibold">点検者</th>
                  <th className="px-3 py-3 font-semibold">異常有無</th>
                  <th className="px-3 py-3 font-semibold">全体コメント</th>
                  <th className="px-3 py-3 font-semibold">異常コメント</th>
                  <th className="px-3 py-3 font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((inspection) => (
                  <tr key={inspection.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-4">{formatDate(inspection.inspection_date)}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">
                      {inspection.target?.name || '-'}
                    </td>
                    <td className="px-3 py-4">{inspection.template?.name || '-'}</td>
                    <td className="px-3 py-4">{inspection.inspector?.name || '-'}</td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          inspection.abnormal_flag
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {inspection.abnormal_flag ? '異常あり' : '異常なし'}
                      </span>
                    </td>
                    <td className="px-3 py-4">{shortenText(inspection.comment)}</td>
                    <td className="px-3 py-4">{shortenText(inspection.abnormal_comment)}</td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/inspections/${inspection.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          詳細
                        </Link>

                        <Link
                          to={`/inspections/${inspection.id}/edit`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          編集
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
  );
}