import { coursePackages, type CoursePackage } from './billing/packages'
export type ProgramClassOption = CoursePackage
export function getProgramClassOptions(title: string): ProgramClassOption[] {
  if (title === 'Level-Based Group Classes')
    return coursePackages.filter((item) => item.courseKey === 'group')
  if (title === 'Competition Solo & Duet')
    return coursePackages.filter((item) => item.courseKey !== 'group')
  return []
}
