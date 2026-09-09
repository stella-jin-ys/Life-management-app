const MEAL_GROUPS = [
  ['produce', 'has_produce'],
  ['protein', 'has_protein'],
  ['carbohydrate', 'has_carbohydrate'],
  ['healthy fat', 'has_healthy_fat'],
]

function hashString(value) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getEstimatedFeelingSignal(feelingId, entryDate) {
  const percentage = 42 + (hashString(`${feelingId}:${entryDate}`) % 37)
  return { percentage, status: 'estimated' }
}

export function getMealBalance(meals = []) {
  const represented = MEAL_GROUPS
    .filter(([, key]) => meals.some((meal) => meal[key]))
    .map(([label]) => label)
  const missing = MEAL_GROUPS
    .filter(([label]) => !represented.includes(label))
    .map(([label]) => label)
  const score = Math.round((represented.length / MEAL_GROUPS.length) * 100)

  let feedback = 'Add a meal when it feels useful; there is no score to catch up on.'
  if (represented.length === MEAL_GROUPS.length) feedback = 'A balanced mix is showing up today.'
  else if (meals.length) feedback = `Nice variety so far. Adding a source of ${missing[0]} could round out the day.`

  return { represented, missing, score, feedback }
}
