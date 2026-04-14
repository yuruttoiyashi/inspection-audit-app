import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type InspectionTargetOption = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  is_active: boolean;
};

type InspectionTemplate = {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
};

type TemplateItem = {
  id: string;
  template_id: string;
  item_name: string;
  sort_order: number;
  is_required: boolean;
};

type ExistingInspectionResult = {
  id: string;
  result: string;
  comment: string | null;
  template_item_id: string;
};

type InspectionHeader = {
  id: string;
  target_id: string;
  template_id: string;
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
  template: InspectionTemplate | null;
  inspector: {
    id: string;
    name: string | null;
    role: string | null;
  } | null;
  results: ExistingInspectionResult[];
};

type ResultValue = '' | 'ok' | 'ng' | 'na';

type InspectionResultFormRow = {
  resultId: string | null;
  templateItemId: string;
  itemName: string;
  isRequired: boolean;
  sortOrder: number;
  result: ResultValue;
  comment: string;
};

type InspectionFormState = {
  targetId: string;
  inspectionDate: string;
  abnormalFlag: boolean;
  comment: string;
  abnormalComment: string;
  results: InspectionResultFormRow[];
};

const initialFormState: InspectionFormState = {
  targetId: '',
  inspectionDate: '',
  abnormalFlag: false,
  comment: '',
  abnormalComment: '',
  results: [],
};

export default function EditInspectionPage() {
  const { inspectionId } = useParams<{ inspectionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [targets, setTargets] = useState<InspectionTargetOption[]>([]);
  const [inspection, setInspection] = useState<InspectionHeader | null>(null);
  const [template, setTemplate] = useState<InspectionTemplate | null>(null);
  const [formState, setFormState] = useState<InspectionFormState>(initialFormState);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    if (!inspectionId) {
      setLoading(false);
      setMessage('点検IDが指定されていません。');
      setMessageType('error');
      return;
    }

    fetchPageData();
  }, [inspectionId]);

  const fetchPageData = async () => {
    if (!inspectionId) return;

    setLoading(true);
    setMessage('');
    setMessageType('');

    const [inspectionResult, targetsResult] = await Promise.all([
      supabase
        .from('inspections')
        .select(
          `
          id,
          target_id,
          template_id,
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
            template_item_id
          )
        `
        )
        .eq('id', inspectionId)
        .single(),
      supabase
        .from('inspection_targets')
        .select('id, name, category, location, is_active')
        .order('name', { ascending: true }),
    ]);

    if (inspectionResult.error) {
      console.error('inspection fetch error:', inspectionResult.error);
      setMessage(`点検データの取得に失敗しました。${inspectionResult.error.message}`);
      setMessageType('error');
      setInspection(null);
      setLoading(false);
      return;
    }

    if (targetsResult.error) {
      console.error('targets fetch error:', targetsResult.error);
      setMessage(`点検対象一覧の取得に失敗しました。${targetsResult.error.message}`);
      setMessageType('error');
      setTargets([]);
      setLoading(false);
      return;
    }

    const inspectionData = inspectionResult.data as InspectionHeader;
    setInspection(inspectionData);
    setTemplate(inspectionData.template ?? null);
    setTargets((targetsResult.data ?? []) as InspectionTargetOption[]);

    const templateItemsResult = await supabase
      .from('inspection_template_items')
      .select('id, template_id, item_name, sort_order, is_required')
      .eq('template_id', inspectionData.template_id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (templateItemsResult.error) {
      console.error('template items fetch error:', templateItemsResult.error);
      setMessage(`テンプレート項目の取得に失敗しました。${templateItemsResult.error.message}`);
      setMessageType('error');
      setLoading(false);
      return;
    }

    const existingResultMap = new Map(
      (inspectionData.results ?? []).map((row) => [row.template_item_id, row])
    );

    const mergedRows = ((templateItemsResult.data ?? []) as TemplateItem[]).map((item) => {
      const existing = existingResultMap.get(item.id);

      return {
        resultId: existing?.id ?? null,
        templateItemId: item.id,
        itemName: item.item_name,
        isRequired: item.is_required,
        sortOrder: item.sort_order,
        result: (existing?.result as ResultValue) ?? '',
        comment: existing?.comment ?? '',
      };
    });

    setFormState({
      targetId: inspectionData.target_id,
      inspectionDate: inspectionData.inspection_date,
      abnormalFlag: inspectionData.abnormal_flag,
      comment: inspectionData.comment ?? '',
      abnormalComment: inspectionData.abnormal_comment ?? '',
      results: mergedRows,
    });

    setLoading(false);
  };

  const selectedTarget = useMemo(() => {
    return targets.find((target) => target.id === formState.targetId) ?? null;
  }, [targets, formState.targetId]);

  const hasNgResult = useMemo(() => {
    return formState.results.some((row) => row.result === 'ng');
  }, [formState.results]);

  const effectiveAbnormalFlag = formState.abnormalFlag || hasNgResult;

  const hasNgComment = useMemo(() => {
    return formState.results.some(
      (row) => row.result === 'ng' && row.comment.trim() !== ''
    );
  }, [formState.results]);

  const fallbackAbnormalComment = useMemo(() => {
    return formState.results
      .filter((row) => row.result === 'ng' && row.comment.trim() !== '')
      .map((row) => `${row.itemName}: ${row.comment.trim()}`)
      .join(' / ');
  }, [formState.results]);

  const completedCount = useMemo(() => {
    return formState.results.filter((row) => row.result !== '').length;
  }, [formState.results]);

  const handleResultChange = (templateItemId: string, value: ResultValue) => {
    setFormState((prev) => ({
      ...prev,
      results: prev.results.map((row) =>
        row.templateItemId === templateItemId
          ? {
              ...row,
              result: value,
            }
          : row
      ),
    }));
  };

  const handleResultCommentChange = (templateItemId: string, value: string) => {
    setFormState((prev) => ({
      ...prev,
      results: prev.results.map((row) =>
        row.templateItemId === templateItemId
          ? {
              ...row,
              comment: value,
            }
          : row
      ),
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!inspectionId) {
      setMessage('点検IDが取得できません。');
      setMessageType('error');
      return;
    }

    if (!formState.targetId) {
      setMessage('点検対象を選択してください。');
      setMessageType('error');
      return;
    }

    if (!formState.inspectionDate) {
      setMessage('点検日を入力してください。');
      setMessageType('error');
      return;
    }

    if (formState.results.length === 0) {
      setMessage('点検項目がありません。');
      setMessageType('error');
      return;
    }

    const hasMissingRequired = formState.results.some(
      (row) => row.isRequired && row.result === ''
    );

    if (hasMissingRequired) {
      setMessage('必須項目の点検結果をすべて選択してください。');
      setMessageType('error');
      return;
    }

    const selectedRows = formState.results.filter((row) => row.result !== '');

    if (selectedRows.length === 0) {
      setMessage('少なくとも1件以上の点検結果を入力してください。');
      setMessageType('error');
      return;
    }

    if (
      effectiveAbnormalFlag &&
      !formState.abnormalComment.trim() &&
      !hasNgComment
    ) {
      setMessage('異常ありの場合は、異常内容コメントまたはNG項目コメントを入力してください。');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    setMessage('');
    setMessageType('');

    const { error: inspectionUpdateError } = await supabase
      .from('inspections')
      .update({
        target_id: formState.targetId,
        inspection_date: formState.inspectionDate,
        abnormal_flag: effectiveAbnormalFlag,
        comment: formState.comment.trim() || null,
        abnormal_comment: effectiveAbnormalFlag
          ? formState.abnormalComment.trim() || fallbackAbnormalComment || null
          : null,
      })
      .eq('id', inspectionId);

    if (inspectionUpdateError) {
      console.error('inspection update error:', inspectionUpdateError);
      setMessage(`点検ヘッダの更新に失敗しました。${inspectionUpdateError.message}`);
      setMessageType('error');
      setSubmitting(false);
      return;
    }

    const upsertPayload = selectedRows.map((row) => ({
      inspection_id: inspectionId,
      template_item_id: row.templateItemId,
      result: row.result,
      comment: row.comment.trim() || null,
    }));

    const { error: upsertError } = await supabase
      .from('inspection_results')
      .upsert(upsertPayload, {
        onConflict: 'inspection_id,template_item_id',
      });

    if (upsertError) {
      console.error('inspection_results upsert error:', upsertError);
      setMessage(`点検結果の更新に失敗しました。${upsertError.message}`);
      setMessageType('error');
      setSubmitting(false);
      return;
    }

    const deleteIds = formState.results
      .filter((row) => row.resultId && row.result === '')
      .map((row) => row.resultId as string);

    if (deleteIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('inspection_results')
        .delete()
        .in('id', deleteIds);

      if (deleteError) {
        console.error('inspection_results delete error:', deleteError);
        setMessage(`未選択項目の整理に失敗しました。${deleteError.message}`);
        setMessageType('error');
        setSubmitting(false);
        return;
      }
    }

    setMessage('点検結果を更新しました。詳細画面へ戻ります。');
    setMessageType('success');

    setTimeout(() => {
      navigate(`/inspections/${inspectionId}`);
    }, 700);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2">
            <Link
              to={inspectionId ? `/inspections/${inspectionId}` : '/inspections'}
              className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
            >
              ← 点検詳細に戻る
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">点検結果を編集</h1>
          <p className="mt-1 text-sm text-slate-600">
            登録済みの点検結果を修正できます。
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="font-semibold text-slate-900">
            入力済み {completedCount} / {formState.results.length}
          </div>
          <div className="mt-1 text-slate-500">
            テンプレートは固定で、結果のみ更新します。
          </div>
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
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">基本情報</h2>

                <div className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="targetId"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      点検対象 <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="targetId"
                      value={formState.targetId}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          targetId: e.target.value,
                        }))
                      }
                      disabled={submitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                    >
                      <option value="">選択してください</option>
                      {targets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.name}
                        </option>
                      ))}
                    </select>
                    {selectedTarget && (
                      <p className="mt-2 text-xs text-slate-500">
                        カテゴリ: {selectedTarget.category || '-'} / 設置場所:{' '}
                        {selectedTarget.location || '-'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      テンプレート
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                      {template?.name || '-'}
                      <div className="mt-1 text-xs text-slate-500">
                        カテゴリ: {template?.category || '-'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="inspectionDate"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      点検日 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="inspectionDate"
                      type="date"
                      value={formState.inspectionDate}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          inspectionDate: e.target.value,
                        }))
                      }
                      disabled={submitting}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                    />
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
                <h2 className="text-xl font-semibold text-slate-900">全体情報</h2>

                <div className="mt-6 space-y-4">
                  <label className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={formState.abnormalFlag}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          abnormalFlag: e.target.checked,
                        }))
                      }
                      disabled={submitting}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    手動で「異常あり」として登録する
                  </label>

                  {hasNgResult && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      NG が1件以上あるため、この点検は保存時に「異常あり」として登録されます。
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="abnormalComment"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      異常内容コメント
                      {effectiveAbnormalFlag && <span className="ml-1 text-rose-500">*</span>}
                    </label>
                    <textarea
                      id="abnormalComment"
                      rows={4}
                      value={formState.abnormalComment}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          abnormalComment: e.target.value,
                        }))
                      }
                      disabled={submitting}
                      placeholder="異常がある場合は内容を入力してください（NG項目コメントがあれば空でも保存可）"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="comment"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      全体コメント
                    </label>
                    <textarea
                      id="comment"
                      rows={4}
                      value={formState.comment}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          comment: e.target.value,
                        }))
                      }
                      disabled={submitting}
                      placeholder="点検全体に関する補足があれば入力してください"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                    />
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">点検項目入力</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    既存結果を修正して保存できます。
                  </p>
                </div>

                {template && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">対象テンプレート:</span>{' '}
                    {template.name}
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                {formState.results.map((row) => (
                  <div
                    key={row.templateItemId}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">
                            表示順 {row.sortOrder}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.isRequired
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.isRequired ? '必須' : '任意'}
                          </span>
                        </div>

                        <h3 className="mt-2 text-base font-semibold text-slate-900">
                          {row.itemName}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`result-${row.templateItemId}`}
                            checked={row.result === 'ok'}
                            onChange={() => handleResultChange(row.templateItemId, 'ok')}
                            disabled={submitting}
                            className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          OK
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`result-${row.templateItemId}`}
                            checked={row.result === 'ng'}
                            onChange={() => handleResultChange(row.templateItemId, 'ng')}
                            disabled={submitting}
                            className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          NG
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`result-${row.templateItemId}`}
                            checked={row.result === 'na'}
                            onChange={() => handleResultChange(row.templateItemId, 'na')}
                            disabled={submitting}
                            className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          対象外
                        </label>

                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`result-${row.templateItemId}`}
                            checked={row.result === ''}
                            onChange={() => handleResultChange(row.templateItemId, '')}
                            disabled={submitting}
                            className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          未選択
                        </label>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        項目コメント
                      </label>
                      <input
                        type="text"
                        value={row.comment}
                        onChange={(e) =>
                          handleResultCommentChange(row.templateItemId, e.target.value)
                        }
                        disabled={submitting}
                        placeholder="必要に応じてコメントを入力"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? '更新中...' : '点検結果を更新'}
                </button>

                <Link
                  to={inspectionId ? `/inspections/${inspectionId}` : '/inspections'}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  キャンセル
                </Link>
              </div>
            </section>
          </div>
        </form>
      )}
    </div>
  );
}