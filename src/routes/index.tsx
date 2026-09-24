import { Link, createFileRoute } from '@tanstack/react-router'

import { ArrowRightIcon, HomeIcon } from '#/components/icons'
import { usePreferences } from '#/components/preferences'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { viewer } = Route.useRouteContext()
  const { t } = usePreferences()

  return (
    <main>
      <p className="badge" aria-hidden="true">
        <HomeIcon size={20} />
      </p>

      <h1>HAUZ</h1>
      <p>{t('home.tagline')}</p>

      {viewer.state === 'ready' && (
        <p>
          {t('home.signedInAs', {
            name: `${viewer.account.firstName} ${viewer.account.lastName}`,
          })}{' '}
          <Link to="/profile" className="go">
            {t('home.viewProfile')}
            <ArrowRightIcon size={15} />
          </Link>
        </p>
      )}

      {viewer.state === 'onboarding' && (
        <p>
          <Link to="/onboarding" className="go">
            {t('home.finishSetup')}
            <ArrowRightIcon size={15} />
          </Link>
        </p>
      )}

      {viewer.state === 'signed-out' && (
        <>
          <p>{t('home.signInPrompt')}</p>
          <Link to="/signin" className="cta">
            {t('nav.signIn')}
            <ArrowRightIcon size={15} />
          </Link>
        </>
      )}

      {viewer.state === 'unknown' && (
        <p role="alert">
          {t('home.unavailable')}
        </p>
      )}
    </main>
  )
}
