import { Link, createFileRoute } from '@tanstack/react-router'

import { ArrowRightIcon } from '#/components/icons'
import { translator } from '#/shared/i18n'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { viewer, locale } = Route.useRouteContext()
  const t = translator(locale)

  return (
    <main>
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
        <p>
          <Link to="/signin">{t('nav.signIn')}</Link> — {t('home.signInPrompt')}
        </p>
      )}

      {viewer.state === 'unknown' && (
        <p role="alert">
          {t('home.unavailable')}
        </p>
      )}
    </main>
  )
}
