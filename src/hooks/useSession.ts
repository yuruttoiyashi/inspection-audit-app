import { useContext } from 'react'
import { AuthContext } from '../providers/AuthProvider'

export function useSession() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useSession must be used within AuthProvider')
  }

  return context
}