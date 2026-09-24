import Link from 'next/link'
import type { ProgramClassOption } from '@/lib/program-class-options'
import styles from './program-class-options.module.css'

export function ProgramClassOptions({
  program,
  options,
}: {
  program: string
  options: ProgramClassOption[]
}) {
  return (
    <div className={styles.options} role="group" aria-label={`${program} class options`}>
      {options.map((option) => (
        <Link className={styles.option} href={`/classes/${option.id}`} key={option.id}>
          <span className={styles.label}>{option.label}</span>{' '}
          <span className={styles.time}>
            {option.day} · {option.start}–{option.end}
          </span>
        </Link>
      ))}
    </div>
  )
}
