import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type InspectionDetail = {
  id: string;
  inspection_date: string;
  abnormal_flag: boolean;
  comment: string | null;
  abnormal_comment: string | null;
  target: {
    id: string;
    name: string;
    category: string | null;
    location: string | null;
  } | null;
  template: {
    id: string;
    name: string;
    category: string | null;
    is_active: boolean;
  } | null;
  inspector: {
    id: string;
    name: string | null;
    role: string | null;
  } | null;
  results: InspectionResultRow[];
};

type InspectionResultRow = {
  id: string;
  result: string;
  comment: string | null;
  templateItem: {
    id: string;
    item_name: string;
    sort_order: number;
    is_required: boolean;
  } | null;
};

export default function InspectionDetailPage() {
  const { inspectionId } = useParams<{ inspectionId: string }>();

  const [loading, setLoading] = useState(true);
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    if (!inspectionId) {
      setLoading(false);
      setMessage('点検IDが指定されていません。');
      setMessageType('error');
      return;
    }

    fetchInspectionDetail();
  }, [inspectionId]);

  const fetchInspectionDetail = async () => {
    if (!inspectionId) return;

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
          name,
          category,
          location
        ),
        template:inspection_templates!inspections_template_id_fkey (
          id,
          name,
          category,
          is_active
        ),
        inspector:profiles!inspections_inspector_id_fkey (
          id,
          name,
          role
        ),
        results:inspection_results (
          id,
          result,
          comment,
          templateItem:inspection_template_items!inspection_results_template_item_id_fkey (
            id,
            item_name,
            sort_order,
            is_required
          )
        )
      `
      )
      .eq('id', inspectionId)
      .single();

    if (error) {
      console.error('inspection detail fetch error:', error);
      setInspection(null);
      setMessage(`点検詳細の取得に失敗しました。${error.message}`);
      setMessageType('error');
    } else {
      setInspection((data ?? null) as InspectionDetail | null);
    }

    setLoading(false);
  };

  const sortedResults = useMemo(() => {
    if (!inspection?.results) return [];

    return [...inspection.results].sort((a, b) => {
      const aOrder = a.templateItem?.sort_order ?? 9999;
      const bOrder = b.templateItem?.sort_order ?? 9999;
      return aOrder - bOrder;
    });
  }, [inspection]);

  const formatDate = (value: string) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('ja-JP');
  };

  const formatResultLabel = (value: string) => {
    switch (value) {
      case 'ok':
        return 'OK';
      case 'ng':
        return 'NG';
      case 'na':
        return '対象外';
      default:
        return value || '-';
    }
  };

  const renderResultBadge = (value: string) => {
    const baseClass =
      'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold';

    if (value === 'ok') {
      return <span className={`${baseClass} bg-emerald-50 text-emerald-700`}>OK</span>;
    }

    if (value === 'ng') {
      return <span className={`${baseClass} bg-rose-50 text-rose-700`}>NG</span>;
    }

    if (value === 'na') {
      return <span className={`${baseClass} bg-slate-100 text-slate-600`}>対象外</span>;
    }

    return <span className={`${baseClass} bg-slate-100 text-slate-600`}>-</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2">
            <Link
              to="/inspections"
              className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              ← 点検実施一覧に戻る
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">点検詳細</h1>
          <p className="mt-1 text-sm text-slate-600">
            登録済みの点検内容と項目ごとの結果を確認できます。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {inspectionId && (
            <Link
              to={`/inspections/${inspectionId}/edit`}
              className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              編集する
            </Link>
          )}

          <button
            type="button"
            onClick={fetchInspectionDetail}
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

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
          読み込み中...
        </div>
      ) : !inspection ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500 shadow-sm">
          点検データを取得できませんでした。
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">基本情報</h2>

              <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">点検日:</span>{' '}
                  {formatDate(inspection.inspection_date)}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">点検対象:</span>{' '}
                  {inspection.target?.name || '-'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">対象カテゴリ:</span>{' '}
                  {inspection.target?.category || '-'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">設置場所:</span>{' '}
                  {inspection.target?.location || '-'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">テンプレート:</span>{' '}
                  {inspection.template?.name || '-'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">テンプレートカテゴリ:</span>{' '}
                  {inspection.template?.category || '-'}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">点検者情報</h2>

              <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">表示名:</span>{' '}
                  {inspection.inspector?.name || '-'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">ロール:</span>{' '}
                  {inspection.inspector?.role || '-'}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">判定情報</h2>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">異常有無</p>
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${
                      inspection.abnormal_flag
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {inspection.abnormal_flag ? '異常あり' : '異常なし'}
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">全体コメント</p>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {inspection.comment || '-'}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">異常内容コメント</p>
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {inspection.abnormal_comment || '-'}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">点検項目結果</h2>
                <p className="mt-2 text-sm text-slate-500">
                  項目ごとの結果とコメントを確認できます。
                </p>
              </div>

              <div className="text-sm text-slate-500">{sortedResults.length}件</div>
            </div>

            <div className="mt-6 overflow-x-auto">
              {sortedResults.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  点検項目結果がありません。
                </div>
              ) : (
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">表示順</th>
                      <th className="px-3 py-3 font-semibold">点検項目名</th>
                      <th className="px-3 py-3 font-semibold">必須</th>
                      <th className="px-3 py-3 font-semibold">結果</th>
                      <th className="px-3 py-3 font-semibold">コメント</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResults.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-4">
                          {row.templateItem?.sort_order ?? '-'}
                        </td>
                        <td className="px-3 py-4 font-semibold text-slate-900">
                          {row.templateItem?.item_name || '-'}
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.templateItem?.is_required
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.templateItem?.is_required ? '必須' : '任意'}
                          </span>
                        </td>
                        <td className="px-3 py-4">{renderResultBadge(row.result)}</td>
                        <td className="px-3 py-4">
                          {row.comment || formatResultLabel(row.result)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}