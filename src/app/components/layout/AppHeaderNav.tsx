import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

type NavItem = {
  label: string;
  to: string;
  end?: boolean;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', end: true },
  { label: '点検対象', to: '/targets' },
  { label: 'テンプレート', to: '/templates' },
  { label: '点検実施', to: '/inspections' },
];

export default function AppHeaderNav() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('ログアウトに失敗しました:', error.message);
      setLoggingOut(false);
      return;
    }

    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            to="/dashboard"
            className="text-lg font-bold text-slate-900 transition hover:text-slate-700"
          >
            点検・監査管理システム
          </Link>
          <p className="mt-1 text-sm text-slate-500">
            Dashboard / 点検対象 / テンプレート / 点検実施 を横断して操作できます。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? 'ログアウト中...' : 'ログアウト'}
          </button>
        </div>
      </div>
    </header>
  );
}