import Link from 'next/link'
import { logout, updateManagedUserProfile, updateUserProfile } from './actions'

export type UserRole = 'student' | 'admin'

export type EditableUserProfile = {
  id: string
  email: string
  role: UserRole
  name: string
  phone: string | null
  guardianName: string
  guardianPhone: string
}

type UserProfileFormProps = {
  profile: EditableUserProfile
  isEditingAnotherUser: boolean
  canManageUsers: boolean
  error?: string
  message?: string
  profileLoadError?: boolean
}

export function UserProfileForm({
  profile,
  isEditingAnotherUser,
  canManageUsers,
  error,
  message,
  profileLoadError = false,
}: UserProfileFormProps) {
  return (
    <section className="profile-section">
      <div className="page-shell profile-layout">
        <header className="profile-header profile-header-with-action">
          <div>
            <p className="eyebrow">
              {isEditingAnotherUser ? 'Admin · User profile' : 'User profile'}
            </p>
            <h1>{isEditingAnotherUser ? profile.name : 'Profile'}</h1>
            <p>
              {isEditingAnotherUser
                ? 'Review and update this user’s account and contact details.'
                : 'Keep your account and contact details up to date.'}
            </p>
          </div>
          {isEditingAnotherUser && (
            <Link className="button button-secondary" href="/users">
              Back to users
            </Link>
          )}
        </header>

        {isEditingAnotherUser && (
          <p className="profile-admin-notice" role="status">
            You are editing another user. Changes will affect their profile immediately.
          </p>
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
            We could not load the saved profile. You can enter the details below and save again.
          </p>
        )}

        <form
          action={isEditingAnotherUser ? updateManagedUserProfile : updateUserProfile}
          className="profile-card"
        >
          <input type="hidden" name="target_user_id" value={profile.id} />

          <div className="profile-card-heading">
            <div>
              <h2>Personal information</h2>
              <p>These details belong to the person using this account.</p>
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
              Email address
              <input
                id="profile_email"
                type="email"
                value={profile.email}
                readOnly
                aria-describedby="email-help"
              />
              <small id="email-help">Saved with the profile and used to log in.</small>
            </label>

            <label htmlFor="profile_role">
              Role
              {isEditingAnotherUser && canManageUsers ? (
                <select id="profile_role" name="role" defaultValue={profile.role}>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <input
                  id="profile_role"
                  type="text"
                  value={profile.role === 'admin' ? 'Admin' : 'Student'}
                  readOnly
                />
              )}
              {isEditingAnotherUser && <small>Only admins can change another user’s role.</small>}
            </label>
          </div>

          {profile.role === 'student' && (
            <fieldset className="profile-guardian-fields">
              <legend>
                Parent/guardian contact <span>Optional</span>
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
          )}

          <div className="profile-save-row">
            <button className="button" type="submit">
              Save changes
            </button>
          </div>
        </form>

        {!isEditingAnotherUser && canManageUsers && (
          <div className="profile-session-row">
            <div>
              <h2>Admin tools</h2>
              <p>View and manage registered users and student contact information.</p>
            </div>
            <Link className="button" href="/users">
              View users
            </Link>
          </div>
        )}

        {!isEditingAnotherUser && (
          <div className="profile-session-row">
            <div>
              <h2>Account access</h2>
              <p>Sign out of this account on this device.</p>
            </div>
            <form action={logout}>
              <button className="button button-secondary" type="submit">
                Log out
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  )
}
