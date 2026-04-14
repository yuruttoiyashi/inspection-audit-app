export type ProfileRole = 'admin' | 'inspector'

export type Profile = {
  id: string
  name: string
  role: ProfileRole
  created_at: string
  updated_at: string
}