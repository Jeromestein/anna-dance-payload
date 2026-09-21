export const courseOptions = [
  { key: 'group', name: 'Group Class', minutes: 60 },
  { key: 'duet', name: 'Duet Class', minutes: 60 },
  { key: 'solo30', name: 'Solo Class', minutes: 30 },
  { key: 'solo60', name: 'Solo Class', minutes: 60 },
] as const

export function courseOption(key: string) {
  return courseOptions.find((course) => course.key === key)
}
