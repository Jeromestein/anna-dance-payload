import { todayDate, type StudentDetails } from '@/lib/students/profile'

export function StudentDetailsFields({
  profile,
  prefix,
}: {
  profile?: Partial<StudentDetails>
  prefix: string
}) {
  return (
    <>
      <label htmlFor={`${prefix}-date_of_birth`}>
        Student date of birth *
        <input
          id={`${prefix}-date_of_birth`}
          name="date_of_birth"
          type="date"
          min="1900-01-01"
          max={todayDate()}
          defaultValue={profile?.date_of_birth ?? ''}
          required
        />
      </label>
      <label htmlFor={`${prefix}-address_line1`}>
        Street address *
        <input
          id={`${prefix}-address_line1`}
          name="address_line1"
          type="text"
          autoComplete="address-line1"
          maxLength={200}
          defaultValue={profile?.address_line1 ?? ''}
          required
        />
      </label>
      <label htmlFor={`${prefix}-address_line2`}>
        Apartment / unit (optional)
        <input
          id={`${prefix}-address_line2`}
          name="address_line2"
          type="text"
          autoComplete="address-line2"
          maxLength={200}
          defaultValue={profile?.address_line2 ?? ''}
        />
      </label>
      <label htmlFor={`${prefix}-city`}>
        City *
        <input
          id={`${prefix}-city`}
          name="city"
          type="text"
          autoComplete="address-level2"
          maxLength={100}
          defaultValue={profile?.city ?? ''}
          required
        />
      </label>
      <label htmlFor={`${prefix}-state`}>
        State *
        <input
          id={`${prefix}-state`}
          name="state"
          type="text"
          autoComplete="address-level1"
          maxLength={100}
          defaultValue={profile?.state ?? ''}
          required
        />
      </label>
      <label htmlFor={`${prefix}-postal_code`}>
        ZIP / postal code *
        <input
          id={`${prefix}-postal_code`}
          name="postal_code"
          type="text"
          autoComplete="postal-code"
          maxLength={20}
          defaultValue={profile?.postal_code ?? ''}
          required
        />
      </label>
      <label className="student-details-wide" htmlFor={`${prefix}-health_notes`}>
        Health notes *
        <textarea
          id={`${prefix}-health_notes`}
          name="health_notes"
          rows={4}
          maxLength={2000}
          aria-describedby={`${prefix}-health-help`}
          defaultValue={profile?.health_notes ?? ''}
          required
        />
        <small id={`${prefix}-health-help`}>
          Note: Please list your child’s allergies and any relevant health conditions. If none,
          enter N/A.
        </small>
      </label>
    </>
  )
}
