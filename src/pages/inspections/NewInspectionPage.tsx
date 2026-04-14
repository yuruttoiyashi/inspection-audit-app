import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type InspectionTargetOption = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  is_active: boolean;
};

type InspectionTemplateOption = {
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

type ResultValue = '' | 'ok' | 'ng' | 'na';

type InspectionResultFormRow = {
  templateItemId: string;
  itemName: string;
  isRequired: boolean;
  sortOrder: number;
  result: ResultValue;
  comment: string;
};

type InspectionFormState = {
  targetId: string;
  templateId: string;
  inspectionDate: string;
  abnormalFlag: boolean;
  comment: string;
  abnormalComment: string;
  results: InspectionResultFormRow[];
};

const getTodayDateString = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};

const initialFormState: InspectionFormState = {
  targetId: '',
  templateId: '',
  inspectionDate: getTodayDateString(),
  abnormalFlag: false,
  comment: '',
  abnormalComment: '',
  results: [],
};

export default function NewInspectionPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [templateItemsLoading, setTemplateItemsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [inspectorId, setInspectorId] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorEmail, setInspectorEmail] = useState('');

  const [targets, setTargets] = useState<InspectionTargetOption[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplateOption[]>([]);
  const [formState, setFormState] = useState<InspectionFormState>(initialFormState);

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!formState.templateId) {
      setFormState((prev) => ({
        ...prev,
        results: [],
      }));
      return;
    }

    fetchTemplateItems(formState.templateId);
  }, [formState.templateId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      setMessage(
        `ログインユーザー情報の取得に失敗しました。${userError?.message ?? ''}`.trim()
      );
      setMessageType('error');
      setLoading(false);
      return;
    }

    const user = userData.user;
    setInspectorId(user.id);
    setInspectorEmail(user.email ?? '');

    const [profileResult, targetsResult, templatesResult] = await Promise.all([
      supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
      supabase
        .from('inspection_targets')
        .select('id, name, category, location, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('inspection_templates')
        .select('id, name, category, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ]);

    if (profileResult.error) {
      console.error('profile fetch error:', profileResult.error);
      setMessage(`プロフィール取得に失敗しました。${profileResult.error.message}`);
      setMessageType('error');
    } else {
      setInspectorName(profileResult.data?.name ?? '');
    }

    if (targetsResult.error) {
      console.error('targets fetch error:', targetsResult.error);
      setMessage(`点検対象一覧の取得に失敗しました。${targetsResult.error.message}`);
      setMessageType('error');
      setTargets([]);
    } else {
      setTargets((targetsResult.data ?? []) as InspectionTargetOption[]);
    }

    if (templatesResult.error) {
      console.error('templates fetch error:', templatesResult.error);
      setMessage(`テンプレート一覧の取得に失敗しました。${templatesResult.error.message}`);
      setMessageType('error');
      setTemplates([]);
    } else {
      setTemplates((templatesResult.data ?? []) as InspectionTemplateOption[]);
    }

    setLoading(false);
  };

  const fetchTemplateItems = async (templateId: string) => {
    setTemplateItemsLoading(true);
    setMessage('');
    setMessageType('');

    const { data, error } = await supabase
      .from('inspection_template_items')
      .select('id, template_id, item_name, sort_order, is_required')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('template items fetch error:', error);
      setMessage(`テンプレート項目の取得に失敗しました。${error.message}`);
      setMessageType('error');

      setFormState((prev) => ({
        ...prev,
        results: [],
      }));
    } else {
      const rows = ((data ?? []) as TemplateItem[]).map((item) => ({
        templateItemId: item.id,
        itemName: item.item_name,
        isRequired: item.is_required,
        sortOrder: item.sort_order,
        result: '' as ResultValue,
        comment: '',
      }));

      setFormState((prev) => ({
        ...prev,
        results: rows,
      }));
    }

    setTemplateItemsLoading(false);
  };

  const selectedTarget = useMemo(() => {
    return targets.find((target) => target.id === formState.targetId) ?? null;
  }, [targets, formState.targetId]);

  const selectedTemplate = useMemo(() => {
    return templates.find((template) => template.id === formState.templateId) ?? null;
  }, [templates, formState.templateId]);

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

  const resetForm = () => {
    setFormState({
      targetId: '',
      templateId: '',
      inspectionDate: getTodayDateString(),
      abnormalFlag: false,
      comment: '',
      abnormalComment: '',
      results: [],
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!inspectorId) {
      setMessage('点検者情報が取得できません。再ログイン後にお試しください。');
      setMessageType('error');
      return;
    }

    if (!formState.targetId) {
      setMessage('点検対象を選択してください。');
      setMessageType('error');
      return;
    }

    if (!formState.templateId) {
      setMessage('テンプレートを選択してください。');
      setMessageType('error');
      return;
    }

    if (!formState.inspectionDate) {
      setMessage('点検日を入力してください。');
      setMessageType('error');
      return;
    }

    if (formState.results.length === 0) {
      setMessage('テンプレート項目がありません。先にテンプレート項目を登録してください。');
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

    const selectedResults = formState.results.filter((row) => row.result !== '');

    if (selectedResults.length === 0) {
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

    const { data: inspectionData, error: inspectionError } = await supabase
      .from('inspections')
      .insert([
        {
          target_id: formState.targetId,
          template_id: formState.templateId,
          inspection_date: formState.inspectionDate,
          inspector_id: inspectorId,
          abnormal_flag: effectiveAbnormalFlag,
          comment: formState.comment.trim() || null,
          abnormal_comment: effectiveAbnormalFlag
            ? formState.abnormalComment.trim() || fallbackAbnormalComment || null
            : null,
        },
      ])
      .select('id')
      .single();

    if (inspectionError || !inspectionData) {
      console.error('inspections insert error:', inspectionError);
      setMessage(`点検ヘッダの登録に失敗しました。${inspectionError?.message ?? ''}`.trim());
      setMessageType('error');
      setSubmitting(false);
      return;
    }

    const resultsPayload = selectedResults.map((row) => ({
      inspection_id: inspectionData.id,
      template_item_id: row.templateItemId,
      result: row.result,
      comment: row.comment.trim() || null,
    }));

    const { error: resultsError } = await supabase
      .from('inspection_results')
      .insert(resultsPayload);

    if (resultsError) {
      console.error('inspection_results insert error:', resultsError);

      await supabase.from('inspections').delete().eq('id', inspectionData.id);

      setMessage(`点検結果の登録に失敗しました。${resultsError.message}`);
      setMessageType('error');
      setSubmitting(false);
      return;
    }

    setMessage('点検結果を登録しました。点検実施一覧へ移動します。');
    setMessageType('success');

    setTimeout(() => {
      navigate('/inspections');
    }, 700);
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

          <h1 className="text-2xl font-bold text-slate-900">新規点検登録</h1>
          <p className="mt-1 text-sm text-slate-600">
            点検対象とテンプレートを選び、点検結果を登録します。
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="font-semibold text-slate-900">
            入力済み {completedCount} / {formState.results.length}
          </div>
          <div className="mt-1 text-slate-500">
            必須項目はすべて結果選択が必要です。
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
                    disabled={loading || submitting}
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
                  <label
                    htmlFor="templateId"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    テンプレート <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="templateId"
                    value={formState.templateId}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        templateId: e.target.value,
                      }))
                    }
                    disabled={loading || submitting}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                  >
                    <option value="">選択してください</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate && (
                    <p className="mt-2 text-xs text-slate-500">
                      カテゴリ: {selectedTemplate.category || '-'}
                    </p>
                  )}
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
                  {inspectorName || '-'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">メール:</span>{' '}
                  {inspectorEmail || '-'}
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
                  テンプレートを選択すると、点検項目が表示されます。
                </p>
              </div>

              {selectedTemplate && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">選択中テンプレート:</span>{' '}
                  {selectedTemplate.name}
                </div>
              )}
            </div>

            <div className="mt-6">
              {templateItemsLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  テンプレート項目を読み込み中...
                </div>
              ) : !formState.templateId ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  先にテンプレートを選択してください。
                </div>
              ) : formState.results.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  このテンプレートには点検項目がありません。テンプレート項目を先に登録してください。
                </div>
              ) : (
                <div className="space-y-4">
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
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <button
                type="submit"
                disabled={loading || submitting}
                className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? '登録中...' : '点検結果を登録'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                入力をリセット
              </button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}