import { supabase } from '../../../lib/supabase'
import type { Profile } from '../../../types/profile'

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, role, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data
}