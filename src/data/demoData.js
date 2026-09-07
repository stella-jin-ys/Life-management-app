export const moods = [
  { id: 'bright', label: 'Bright', note: 'There is room to enjoy what is working.' },
  { id: 'steady', label: 'Steady', note: 'Steady is a real kind of strength.' },
  { id: 'tender', label: 'Tender', note: 'You can move gently and still move forward.' },
  { id: 'heavy', label: 'Heavy', note: 'You are allowed to make today smaller.' },
]

export const feelings = [
  {
    id: 'drained',
    label: 'Drained',
    percentage: 58,
    affirmation: 'Rest is part of carrying on. You do not have to earn a pause.',
  },
  {
    id: 'overwhelmed',
    label: 'Overwhelmed',
    percentage: 68,
    affirmation:
      'You do not have to solve the whole day at once. One softer next step is enough.',
  },
  {
    id: 'lonely',
    label: 'Lonely',
    percentage: 42,
    affirmation: 'Feeling apart does not mean you are alone in this experience.',
  },
  {
    id: 'restless',
    label: 'Restless',
    percentage: 53,
    affirmation: 'Your mind can be busy without every thought needing an answer.',
  },
]

export const initialHighlights = [
  {
    id: 1,
    entry: 'Made a proper breakfast before opening my laptop.',
    compliment: 'You gave yourself care before the day asked anything of you.',
    time: '8:10',
  },
  {
    id: 2,
    entry: 'Sent the message I had been avoiding.',
    compliment: 'That was courage in a very ordinary, very real form.',
    time: '10:45',
  },
]

export const healthMetrics = [
  { id: 'water', label: 'Hydration', value: 5, target: 8, unit: 'glasses', tone: 'coral' },
  { id: 'meals', label: 'Nourishing meals', value: 2, target: 3, unit: 'meals', tone: 'moss' },
  { id: 'sleep', label: 'Sleep', value: 7.2, target: 8, unit: 'hours', tone: 'lavender' },
  { id: 'movement', label: 'Movement', value: 24, target: 30, unit: 'minutes', tone: 'gold' },
]

export const initialGoal = {
  title: 'A little more of what matters',
  why: 'Small actions that keep your priorities close.',
  milestones: [
    { id: 1, label: 'Read 12 books', complete: true },
    { id: 2, label: 'Run a 10k', complete: false },
  ],
}
