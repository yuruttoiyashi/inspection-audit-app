import { supabase } from '../../../lib/supabase'

export type LoginInput = {
  email: string
  password: string
}

export async function signInWithEmail(input: LoginInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signUpWithEmail(input: LoginInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  })

  if (error) {
    throw error
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}