import { Outlet } from 'react-router-dom';
import AppHeaderNav from '../app/components/layout/AppHeaderNav';

export default function AppShell() {
  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeaderNav />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}