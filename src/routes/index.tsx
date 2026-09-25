import { Link, createFileRoute } from '@tanstack/react-router'

import { ArrowRightIcon, HomeIcon } from '#/components/icons'
import { usePreferences } from '#/components/preferences'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { viewer } = Route.useRouteContext()
  const { t } = usePreferences()

  if (viewer.state === 'ready') {
    const { account } = viewer

    return (
      <main>
        <h1>{t('home.greeting', { name: account.firstName })}</h1>
        <p>{t('home.covers')}</p>

        {/* Their own record, read back. There are no listings in this build and
            inventing some would say less than showing what is actually stored. */}
        <section className="panel" aria-labelledby="summary">
          <h2 id="summary">{t('home.summary')}</h2>

          <dl>
            <div>
              <dt>{t('onboarding.firstName')}</dt>
              <dd>
                {account.firstName} {account.lastName}
              </dd>
            </div>
            <div>
              <dt>{t('profile.role')}</dt>
              <dd>
                <span className="pill">
                  {t(`onboarding.role.${account.role}`)}
                </span>
              </dd>
            </div>
            <div>
              <dt>{t('profile.contactEmail')}</dt>
              <dd className={account.contactEmail ? undefined : 'empty'}>
                {account.contactEmail ?? t('home.notSet')}
              </dd>
            </div>
            <div>
              <dt>{t('profile.bio')}</dt>
              <dd className={account.bio ? undefined : 'empty'}>
                {account.bio ?? t('home.notSet')}
              </dd>
            </div>
          </dl>

          <Link to="/profile" className="go">
            {t('home.edit')}
            <ArrowRightIcon size={15} />
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main>
      <p className="badge" aria-hidden="true">
        <HomeIcon size={20} />
      </p>

      <h1>HAUZ</h1>
      <p>{t('home.tagline')}</p>

      {viewer.state === 'onboarding' && (
        <Link to="/onboarding" className="cta">
          {t('home.finishSetup')}
          <ArrowRightIcon size={15} />
        </Link>
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

      {viewer.state === 'unknown' && <p role="alert">{t('home.unavailable')}</p>}
    </main>
  )
}
