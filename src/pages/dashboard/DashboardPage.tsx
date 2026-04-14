import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { normalizeRelation } from '../../lib/supabaseRelationHelpers';

type Profile = {
  name: string | null;
  role: string | null;
};

type DashboardStats = {
  targetCount: number;
  activeTargetCount: number;
  templateCount: number;
  activeTemplateCount: number;
  templateItemCount: number;
  inspectionCount: number;
};

type RecentTarget = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
};

type RecentTemplate = {
  id: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
};

type RecentInspectionRowRaw = {
  id: string;
  inspection_date: string;
  abnormal_flag: boolean;
  comment: string | null;
  abnormal_comment: string | null;
  target: unknown;
  template: unknown;
  inspector: unknown;
};

type RecentInspection = {
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

const initialStats: DashboardStats = {
  targetCount: 0,
  activeTargetCount: 0,
  templateCount: 0,
  activeTemplateCount: 0,
  templateItemCount: 0,
  inspectionCount: 0,
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentTargets, setRecentTargets] = useState<RecentTarget[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<RecentTemplate[]>([]);
  const [recentInspections, setRecentInspections] = useState<RecentInspection[]>([]);

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMessage('');

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setErrorMessage(`ログインユーザー情報の取得に失敗しました。${userError.message}`);
      setLoading(false);
      return;
    }

    const user = userData.user;
    setLoginEmail(user?.email ?? '');

    const profilePromise = user
      ? supabase.from('profiles').select('name, role').eq('id', user.id).single()
      : Promise.resolve({ data: null, error: null });

    const [
      profileResult,
      targetCountResult,
      activeTargetCountResult,
      templateCountResult,
      activeTemplateCountResult,
      templateItemCountResult,
      inspectionCountResult,
      recentTargetsResult,
      recentTemplatesResult,
      recentInspectionsResult,
    ] = await Promise.all([
      profilePromise,
      supabase.from('inspection_targets').select('*', { count: 'exact', head: true }),
      supabase
        .from('inspection_targets')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase.from('inspection_templates').select('*', { count: 'exact', head: true }),
      supabase
        .from('inspection_templates')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase.from('inspection_template_items').select('*', { count: 'exact', head: true }),
      supabase.from('inspections').select('*', { count: 'exact', head: true }),
      supabase
        .from('inspection_targets')
        .select('id, name, category, location, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('inspection_templates')
        .select('id, name, category, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
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
        .order('id', { ascending: false })
        .limit(5),
    ]);

    const profileError =
      profileResult && 'error' in profileResult ? profileResult.error : null;

    if (profileError && profileError.code !== 'PGRST116') {
      setErrorMessage(`プロフィール取得に失敗しました。${profileError.message}`);
    } else {
      const profileData =
        profileResult && 'data' in profileResult ? profileResult.data : null;
      setProfile(profileData);
    }

    const firstError =
      targetCountResult.error ||
      activeTargetCountResult.error ||
      templateCountResult.error ||
      activeTemplateCountResult.error ||
      templateItemCountResult.error ||
      inspectionCountResult.error ||
      recentTargetsResult.error ||
      recentTemplatesResult.error ||
      recentInspectionsResult.error;

    if (firstError) {
      setErrorMessage(`ダッシュボード情報の取得に失敗しました。${firstError.message}`);
      setLoading(false);
      return;
    }

    setStats({
      targetCount: targetCountResult.count ?? 0,
      activeTargetCount: activeTargetCountResult.count ?? 0,
      templateCount: templateCountResult.count ?? 0,
      activeTemplateCount: activeTemplateCountResult.count ?? 0,
      templateItemCount: templateItemCountResult.count ?? 0,
      inspectionCount: inspectionCountResult.count ?? 0,
    });

    setRecentTargets((recentTargetsResult.data ?? []) as RecentTarget[]);
    setRecentTemplates((recentTemplatesResult.data ?? []) as RecentTemplate[]);

    const recentInspectionRows = (recentInspectionsResult.data ?? []) as RecentInspectionRowRaw[];

    const normalizedRecentInspections: RecentInspection[] = recentInspectionRows.map((row) => ({
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

    setRecentInspections(normalizedRecentInspections);
    setLoading(false);
  };

  const formatDateTime = (value: string) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString('ja-JP');
  };

  const formatDate = (value: string) => {
    if (!value) return '-';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('ja-JP');
  };

  const renderStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {isActive ? '有効' : '無効'}
      </span>
    );
  };

  const renderAbnormalBadge = (isAbnormal: boolean) => {
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          isAbnormal ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
        }`}
      >
        {isAbnormal ? '異常あり' : '異常なし'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="mt-2 text-sm text-slate-600">
            点検対象・テンプレート・点検項目・点検実施の登録状況をまとめて確認できます。
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchDashboardData()}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? '更新中...' : '最新情報に更新'}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">点検対象数</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? '-' : stats.targetCount}</p>
          <p className="mt-2 text-xs text-slate-500">登録済みの点検対象</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">有効な点検対象</p>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {loading ? '-' : stats.activeTargetCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">現在利用中の対象</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">テンプレート数</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? '-' : stats.templateCount}</p>
          <p className="mt-2 text-xs text-slate-500">登録済みテンプレート</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">有効テンプレート</p>
          <p className="mt-3 text-3xl font-bold text-emerald-700">
            {loading ? '-' : stats.activeTemplateCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">運用可能なテンプレート</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">点検項目数</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? '-' : stats.templateItemCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">テンプレート配下の項目総数</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">点検実施数</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? '-' : stats.inspectionCount}
          </p>
          <p className="mt-2 text-xs text-slate-500">登録済みの点検件数</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">ログインユーザー情報</h2>

            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <div>
                <span className="font-semibold text-slate-900">表示名:</span> {profile?.name || '-'}
              </div>
              <div>
                <span className="font-semibold text-slate-900">ロール:</span> {profile?.role || '-'}
              </div>
              <div>
                <span className="font-semibold text-slate-900">ログイン中メール:</span>{' '}
                {loginEmail || '-'}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">次にやること</h2>
            <div className="mt-5 grid grid-cols-1 gap-3">
              <Link
                to="/targets"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-slate-100"
              >
                <div className="text-sm font-semibold text-slate-900">点検対象を追加・更新する</div>
                <div className="mt-1 text-xs text-slate-500">
                  設置場所やカテゴリを整理して登録できます。
                </div>
              </Link>

              <Link
                to="/templates"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-slate-100"
              >
                <div className="text-sm font-semibold text-slate-900">テンプレートを整備する</div>
                <div className="mt-1 text-xs text-slate-500">
                  テンプレート登録と項目管理へ進めます。
                </div>
              </Link>

              <Link
                to="/inspections"
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:bg-slate-100"
              >
                <div className="text-sm font-semibold text-slate-900">点検実施を確認する</div>
                <div className="mt-1 text-xs text-slate-500">
                  実施一覧から登録済み点検と詳細を確認できます。
                </div>
              </Link>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">最近登録した点検対象</h2>
                <p className="mt-2 text-sm text-slate-500">直近で登録された点検対象を確認できます。</p>
              </div>
              <Link
                to="/targets"
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                すべて見る
              </Link>
            </div>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-slate-500">読み込み中...</div>
              ) : recentTargets.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  点検対象はまだ登録されていません。
                </div>
              ) : (
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">点検対象名</th>
                      <th className="px-3 py-3 font-semibold">カテゴリ</th>
                      <th className="px-3 py-3 font-semibold">設置場所</th>
                      <th className="px-3 py-3 font-semibold">状態</th>
                      <th className="px-3 py-3 font-semibold">登録日時</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTargets.map((target) => (
                      <tr key={target.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-4 font-semibold text-slate-900">{target.name}</td>
                        <td className="px-3 py-4">{target.category || '-'}</td>
                        <td className="px-3 py-4">{target.location || '-'}</td>
                        <td className="px-3 py-4">{renderStatusBadge(target.is_active)}</td>
                        <td className="px-3 py-4">{formatDateTime(target.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">最近登録したテンプレート</h2>
                <p className="mt-2 text-sm text-slate-500">直近で登録されたテンプレートを確認できます。</p>
              </div>
              <Link
                to="/templates"
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                すべて見る
              </Link>
            </div>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-slate-500">読み込み中...</div>
              ) : recentTemplates.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  テンプレートはまだ登録されていません。
                </div>
              ) : (
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="px-3 py-3 font-semibold">テンプレート名</th>
                      <th className="px-3 py-3 font-semibold">カテゴリ</th>
                      <th className="px-3 py-3 font-semibold">状態</th>
                      <th className="px-3 py-3 font-semibold">登録日時</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTemplates.map((template) => (
                      <tr key={template.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-4 font-semibold text-slate-900">{template.name}</td>
                        <td className="px-3 py-4">{template.category || '-'}</td>
                        <td className="px-3 py-4">{renderStatusBadge(template.is_active)}</td>
                        <td className="px-3 py-4">{formatDateTime(template.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">最近の点検実施</h2>
                <p className="mt-2 text-sm text-slate-500">直近で登録された点検実施を確認できます。</p>
              </div>
              <Link
                to="/inspections"
                className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
              >
                すべて見る
              </Link>
            </div>

            <div className="mt-6 overflow-x-auto">
              {loading ? (
                <div className="py-10 text-center text-sm text-slate-500">読み込み中...</div>
              ) : recentInspections.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  点検実施データはまだ登録されていません。
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
                    </tr>
                  </thead>
                  <tbody>
                    {recentInspections.map((inspection) => (
                      <tr key={inspection.id} className="border-b border-slate-100 text-slate-700">
                        <td className="px-3 py-4">{formatDate(inspection.inspection_date)}</td>
                        <td className="px-3 py-4 font-semibold text-slate-900">
                          {inspection.target?.name || '-'}
                        </td>
                        <td className="px-3 py-4">{inspection.template?.name || '-'}</td>
                        <td className="px-3 py-4">{inspection.inspector?.name || '-'}</td>
                        <td className="px-3 py-4">{renderAbnormalBadge(inspection.abnormal_flag)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}