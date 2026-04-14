export type InspectionTarget = {
  id: string
  name: string
  category: string
  location: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CreateInspectionTargetInput = {
  name: string
  category: string
  location: string
  is_active: boolean
}