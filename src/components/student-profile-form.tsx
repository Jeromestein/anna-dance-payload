import { logoutStudent, updateStudentProfile } from '@/actions/student-profiles'

export type EditableStudentProfile = {
  id: string
  email: string
  name: string
  phone: string | null
  guardianName: string
  guardianPhone: string
}

type StudentProfileFormProps = {
  profile: EditableStudentProfile
  error?: string
  message?: string
  profileLoadError?: boolean
  embedded?: boolean
}

export function StudentProfileForm({
  profile,
  error,
  message,
  profileLoadError = false,
  embedded = false,
}: StudentProfileFormProps) {
  const content = (
    <>
      {!embedded && (
        <header className="profile-header">
          <p className="eyebrow">Student</p>
          <h1>Profile</h1>
          <p>Keep your contact information up to date.</p>
        </header>
      )}

      {error && (
        <p className="auth-alert auth-alert-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="auth-alert auth-alert-success" role="status">
          {message}
        </p>
      )}
      {profileLoadError && (
        <p className="auth-alert auth-alert-error" role="alert">
          We could not load the saved profile. Enter the details below and save again.
        </p>
      )}

      <form
        action={updateStudentProfile}
        className="profile-card"
        id={embedded ? 'profile' : undefined}
      >
        <input type="hidden" name="target_student_id" value={profile.id} />

        <div className="profile-card-heading">
          <div>
            <h2>Personal information</h2>
            <p>These details belong to the Student using this login.</p>
          </div>
        </div>

        <div className="profile-fields">
          <label htmlFor="name">
            Name
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={100}
              defaultValue={profile.name}
              required
            />
          </label>

          <label htmlFor="phone">
            Phone number <span className="profile-field-optional">Optional</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              maxLength={24}
              defaultValue={profile.phone ?? ''}
            />
          </label>

          <label htmlFor="profile_email">
            Email
            <input id="profile_email" type="email" value={profile.email} readOnly />
            <small>Saved with this profile and used to log in.</small>
          </label>
        </div>

        <fieldset className="profile-guardian-fields">
          <legend>
            Parent/guardian <span>Optional</span>
          </legend>
          <div className="profile-fields">
            <label htmlFor="guardian_name">
              Name
              <input
                id="guardian_name"
                name="guardian_name"
                type="text"
                autoComplete="off"
                maxLength={100}
                defaultValue={profile.guardianName}
              />
            </label>

            <label htmlFor="guardian_phone">
              Phone number
              <input
                id="guardian_phone"
                name="guardian_phone"
                type="tel"
                autoComplete="off"
                inputMode="tel"
                maxLength={24}
                defaultValue={profile.guardianPhone}
              />
            </label>
          </div>
        </fieldset>

        <div className="profile-save-row">
          <button className="button" type="submit">
            Save changes
          </button>
        </div>
      </form>

      <div className="profile-session-row">
        <div>
          <h2>Sign out</h2>
          <p>End this Student session on this device.</p>
        </div>
        <form action={logoutStudent}>
          <button className="button button-secondary" type="submit">
            Log out
          </button>
        </form>
      </div>
    </>
  )

  if (embedded) return content

  return (
    <section className="profile-section">
      <div className="page-shell profile-layout">{content}</div>
    </section>
  )
}
