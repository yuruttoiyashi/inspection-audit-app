import { supabase } from '../../../lib/supabase'
import type {
  CreateInspectionTargetInput,
  InspectionTarget,
} from '../../../types/inspectionTarget'

export async function getInspectionTargets(): Promise<InspectionTarget[]> {
  const { data, error } = await supabase
    .from('inspection_targets')
    .select('id, name, category, location, is_active, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createInspectionTarget(
  input: CreateInspectionTargetInput,
): Promise<InspectionTarget> {
  const { data, error } = await supabase
    .from('inspection_targets')
    .insert({
      name: input.name,
      category: input.category,
      location: input.location,
      is_active: input.is_active,
    })
    .select('id, name, category, location, is_active, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateInspectionTarget(
  id: string,
  input: CreateInspectionTargetInput,
): Promise<InspectionTarget> {
  const { data, error } = await supabase
    .from('inspection_targets')
    .update({
      name: input.name,
      category: input.category,
      location: input.location,
      is_active: input.is_active,
    })
    .eq('id', id)
    .select('id, name, category, location, is_active, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data
}