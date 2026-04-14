import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export default function ProtectedRoute() {
  const { user, isLoading } = useSession()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">読み込み中...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}