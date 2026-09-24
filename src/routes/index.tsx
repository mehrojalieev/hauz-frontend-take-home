import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { viewer } = Route.useRouteContext()

  return (
    <main>
      <h1>HAUZ</h1>
      <p>Property in Uzbekistan. This build covers the sign-in slice.</p>

      {viewer.state === 'ready' && (
        <p>
          Signed in as {viewer.account.firstName} {viewer.account.lastName}.{' '}
          <Link to="/profile">View your profile</Link>
        </p>
      )}

      {viewer.state === 'onboarding' && (
        <p>
          <Link to="/onboarding">Finish setting up your account</Link>
        </p>
      )}

      {viewer.state === 'signed-out' && (
        <p>
          <Link to="/signin">Sign in</Link> to set up your profile.
        </p>
      )}

      {viewer.state === 'unknown' && (
        <p role="alert">
          We could not reach your account just now. Reload in a moment.
        </p>
      )}
    </main>
  )
}
