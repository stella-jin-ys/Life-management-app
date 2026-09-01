import { feelings } from '../data/demoData.js'

export function createCompliment(entry) {
  const win = entry.trim()
  return `“${win}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`
}

export function getComfortSignal(feelingId) {
  const feeling = feelings.find(({ id }) => id === feelingId)
  const { percentage, affirmation, label } = feeling ?? feelings[0]
  return { percentage, affirmation, label }
}

export function calculateProgress(items) {
  if (items.length === 0) return 0

  const completed = items.filter(({ complete }) => complete).length
  return Math.round((completed / items.length) * 100)
}
