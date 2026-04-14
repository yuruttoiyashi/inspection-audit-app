import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../../hooks/useSession'
import { signInWithEmail, signUpWithEmail } from '../../features/auth/services/authService'

export default function LoginPage() {
  const navigate = useNavigate()
  const { user, isLoading } = useSession()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [isLoading, user, navigate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage('')

    if (!email || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください。')
      return
    }

    if (password.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください。')
      return
    }

    try {
      setIsSubmitting(true)

      if (mode === 'login') {
        await signInWithEmail({ email, password })
        navigate('/dashboard', { replace: true })
        return
      }

      const result = await signUpWithEmail({ email, password })

      if (result.user && !result.session) {
        alert('確認メールを送信しました。メール確認後にログインしてください。')
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '認証に失敗しました。'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'login' ? 'ログイン' : '新規登録'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            点検・監査管理システム
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              メールアドレス
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              パスワード
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-slate-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting
              ? '送信中...'
              : mode === 'login'
                ? 'ログイン'
                : '新規登録する'}
          </button>
        </form>

        <div className="mt-4">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="text-sm font-medium text-slate-900 underline"
            >
              初めての方はこちら（新規登録）
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-sm font-medium text-slate-900 underline"
            >
              すでにアカウントがある方はこちら
            </button>
          )}
        </div>
      </div>
    </div>
  )
}