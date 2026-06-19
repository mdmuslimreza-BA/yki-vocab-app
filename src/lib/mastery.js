import { supabase } from './supabase'

// mastery_level: 0=unseen, 1=seen, 2=learning, 3=good, 4=great, 5=mastered
function calcLevel(correct, attempts) {
  if (attempts === 0) return 0
  const rate = correct / attempts
  if (attempts >= 5 && rate >= 0.9) return 5
  if (attempts >= 4 && rate >= 0.8) return 4
  if (attempts >= 3 && rate >= 0.7) return 3
  if (attempts >= 2 && rate >= 0.5) return 2
  return 1
}

export async function updateMastery(studentId, wordId, listId, correct) {
  const { data: existing } = await supabase
    .from('word_mastery')
    .select('id, correct_count, attempt_count')
    .eq('student_id', studentId)
    .eq('word_id', wordId)
    .single()

  const newCorrect  = (existing?.correct_count ?? 0) + (correct ? 1 : 0)
  const newAttempts = (existing?.attempt_count ?? 0) + 1
  const newLevel    = calcLevel(newCorrect, newAttempts)

  if (existing) {
    await supabase.from('word_mastery').update({
      correct_count: newCorrect,
      attempt_count: newAttempts,
      mastery_level: newLevel,
      updated_at: new Date().toISOString()
    }).eq('id', existing.id)
  } else {
    await supabase.from('word_mastery').insert({
      student_id: studentId, word_id: wordId, list_id: listId,
      correct_count: newCorrect, attempt_count: newAttempts, mastery_level: newLevel
    })
  }
}

export function masteryStars(level) {
  const filled = '⭐'.repeat(level)
  const empty  = '☆'.repeat(5 - level)
  return filled + empty
}

export function masteryLabel(level) {
  return ['Unseen', 'Seen', 'Learning', 'Good', 'Great', 'Mastered'][level] ?? 'Unseen'
}

export function masteryColor(level) {
  if (level >= 5) return 'text-yellow-500'
  if (level >= 3) return 'text-green-500'
  if (level >= 1) return 'text-orange-400'
  return 'text-stone-300'
}
