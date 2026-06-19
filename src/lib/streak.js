import { supabase } from './supabase'

export async function updateStreak(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak, last_practiced')
    .eq('id', userId)
    .single()

  if (!profile) return

  const today = new Date().toISOString().slice(0, 10)
  const last  = profile.last_practiced

  if (last === today) return // already practiced today

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const newStreak = last === yesterday ? (profile.streak ?? 0) + 1 : 1

  await supabase
    .from('profiles')
    .update({ streak: newStreak, last_practiced: today })
    .eq('id', userId)
}
