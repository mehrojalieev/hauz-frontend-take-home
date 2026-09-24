/**
 * Three languages, because HAUZ is for Uzbekistan and a property listing there
 * is read in Uzbek, Russian or English depending on who is looking.
 *
 * The chosen language lives in a cookie and is resolved during SSR, exactly
 * like the theme and the signed-in person. That is deliberate: a language
 * picked in the browser and applied after hydration would flash the wrong one
 * on every hard refresh, and it would arrive too late for `<html lang>`, which
 * screen readers and translation tools read before any of our code runs.
 */

export const LOCALES = ['uz', 'ru', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O‘zbekcha",
  ru: 'Русский',
  en: 'English',
}

export function parseLocale(raw: unknown): Locale {
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : 'uz'
}

type Dictionary = Record<string, string>

const uz: Dictionary = {
  'nav.signIn': 'Kirish',
  'nav.logOut': 'Chiqish',
  'nav.loggingOut': 'Chiqilmoqda…',
  'nav.authUnavailable': 'Holat aniqlanmadi',
  'nav.appearance': 'Ko‘rinish',
  'nav.language': 'Til',
  'theme.system': 'Avto',
  'theme.light': 'Yorug‘',
  'theme.dark': 'Qorong‘i',

  'home.tagline':
    'O‘zbekistondagi ko‘chmas mulk. Bu qurilma kirish oqimini qamrab oladi.',
  'home.signedInAs': '{name} sifatida kirgansiz.',
  'home.viewProfile': 'Profilingizni ko‘rish',
  'home.finishSetup': 'Akkauntni sozlashni yakunlang',
  'home.signInPrompt': 'Profil yaratish uchun kiring.',
  'home.unavailable':
    'Akkauntingizga hozir ulana olmadik. Bir ozdan keyin yangilang.',

  'signin.title': 'Kirish',
  'signin.subtitle': 'Parol kerak emas. Emailingizga bir martalik kod keladi.',
  'signin.spamNote': 'Kod kelmadimi? Spam papkasini tekshiring.',
  'signin.step': '{current} / {total}-qadam',
  'signin.email': 'Email',
  'signin.send': 'Kod yuborish',
  'signin.sending': 'Yuborilmoqda…',
  'signin.sentTo': '{email} manziliga kod yubordik. U 15 daqiqa amal qiladi.',
  'signin.code': 'Olti xonali kod',
  'signin.continue': 'Davom etish',
  'signin.checking': 'Tekshirilmoqda…',
  'signin.otherEmail': 'Boshqa email ishlatish',

  'onboarding.title': 'O‘zingiz haqingizda',
  'onboarding.subtitle': 'Profilingiz e’lonlaringiz yonida ko‘rinadi.',
  'onboarding.intro': 'HAUZ dan foydalanishdan oldin shu kerak.',
  'onboarding.firstName': 'Ism',
  'onboarding.lastName': 'Familiya',
  'onboarding.roleLegend': 'Men',
  'onboarding.role.property_owner': 'Mulk egasi',
  'onboarding.role.realtor': 'Rieltor',
  'onboarding.roleWarning': 'Buni keyin o‘zgartirib bo‘lmaydi.',
  'onboarding.continue': 'Davom etish',
  'onboarding.saving': 'Saqlanmoqda…',

  'profile.title': 'Profilingiz',
  'profile.intro': 'HAUZ dagi boshqalar shuni ko‘radi.',
  'profile.contactEmail': 'Bog‘lanish uchun email',
  'profile.contactEmailHint':
    'Ixtiyoriy, va kirish emailidan boshqa. O‘chirish uchun bo‘shatib qo‘ying.',
  'profile.bio': 'Qisqacha ma’lumot',
  'profile.bioHint': 'Ixtiyoriy. O‘chirish uchun bo‘shatib qo‘ying.',
  'profile.role': 'Rol',
  'profile.roleHint': 'Ro‘yxatdan o‘tganda tanlangan, o‘zgarmaydi.',
  'profile.save': 'O‘zgarishlarni saqlash',
  'profile.saving': 'Saqlanmoqda…',
  'profile.saved': 'Saqlandi.',
  'profile.loadFailed':
    'Profilingizni hozir yuklay olmadik. Bir ozdan keyin yangilang; siz hali tizimdasiz.',

  'notFound.title': 'Sahifa topilmadi',
  'notFound.body': 'Bu manzilda hech narsa yo‘q. Havola eskirgan bo‘lishi mumkin.',
  'notFound.home': 'Bosh sahifaga',

  'error.rate_limited': 'Urinishlar juda ko‘p. Bir daqiqa kutib qayta urining.',
  'error.invalid_code': 'Kod noto‘g‘ri yoki muddati o‘tgan.',
  'error.expired': 'Kod muddati o‘tdi. Yangisini olish uchun emailni kiriting.',
  'error.unavailable': 'Hozir ishlamayapti. Qayta urinib ko‘ring.',
  'error.role_conflict': 'Sizda boshqa rol bilan akkaunt bor.',
  'error.invalid': 'Kiritilgan ma’lumotni tekshiring.',
  'error.not_onboarded':
    'Profilingiz topilmadi. Uni sozlash uchun qaytadan kiring.',
}

const ru: Dictionary = {
  'nav.signIn': 'Войти',
  'nav.logOut': 'Выйти',
  'nav.loggingOut': 'Выходим…',
  'nav.authUnavailable': 'Статус недоступен',
  'nav.appearance': 'Оформление',
  'nav.language': 'Язык',
  'theme.system': 'Авто',
  'theme.light': 'Светлая',
  'theme.dark': 'Тёмная',

  'home.tagline':
    'Недвижимость в Узбекистане. Эта сборка охватывает вход в аккаунт.',
  'home.signedInAs': 'Вы вошли как {name}.',
  'home.viewProfile': 'Открыть профиль',
  'home.finishSetup': 'Завершите настройку аккаунта',
  'home.signInPrompt': 'Войдите, чтобы создать профиль.',
  'home.unavailable':
    'Не удалось получить данные аккаунта. Обновите страницу чуть позже.',

  'signin.title': 'Вход',
  'signin.subtitle': 'Пароль не нужен. На почту придёт одноразовый код.',
  'signin.spamNote': 'Код не пришёл? Проверьте папку «Спам».',
  'signin.step': 'Шаг {current} из {total}',
  'signin.email': 'Почта',
  'signin.send': 'Отправить код',
  'signin.sending': 'Отправляем…',
  'signin.sentTo': 'Код отправлен на {email}. Он действует 15 минут.',
  'signin.code': 'Шестизначный код',
  'signin.continue': 'Продолжить',
  'signin.checking': 'Проверяем…',
  'signin.otherEmail': 'Другая почта',

  'onboarding.title': 'Расскажите о себе',
  'onboarding.subtitle': 'Профиль виден рядом с вашими объявлениями.',
  'onboarding.intro': 'Это нужно, чтобы пользоваться HAUZ.',
  'onboarding.firstName': 'Имя',
  'onboarding.lastName': 'Фамилия',
  'onboarding.roleLegend': 'Я',
  'onboarding.role.property_owner': 'Собственник',
  'onboarding.role.realtor': 'Риелтор',
  'onboarding.roleWarning': 'Позже это изменить нельзя.',
  'onboarding.continue': 'Продолжить',
  'onboarding.saving': 'Сохраняем…',

  'profile.title': 'Ваш профиль',
  'profile.intro': 'Это видят другие на HAUZ.',
  'profile.contactEmail': 'Почта для связи',
  'profile.contactEmailHint':
    'Необязательно, и это не почта для входа. Очистите поле, чтобы удалить.',
  'profile.bio': 'О себе',
  'profile.bioHint': 'Необязательно. Очистите поле, чтобы удалить.',
  'profile.role': 'Роль',
  'profile.roleHint': 'Выбрана при регистрации и не меняется.',
  'profile.save': 'Сохранить',
  'profile.saving': 'Сохраняем…',
  'profile.saved': 'Сохранено.',
  'profile.loadFailed':
    'Не удалось загрузить профиль. Обновите чуть позже — вы всё ещё в аккаунте.',

  'notFound.title': 'Страница не найдена',
  'notFound.body': 'По этому адресу ничего нет. Возможно, ссылка устарела.',
  'notFound.home': 'На главную',

  'error.rate_limited': 'Слишком много попыток. Подождите минуту.',
  'error.invalid_code': 'Код неверный или устарел.',
  'error.expired': 'Код устарел. Укажите почту, чтобы получить новый.',
  'error.unavailable': 'Сейчас недоступно. Попробуйте ещё раз.',
  'error.role_conflict': 'У вас уже есть аккаунт с другой ролью.',
  'error.invalid': 'Проверьте введённые данные.',
  'error.not_onboarded': 'Профиль не найден. Войдите снова, чтобы создать его.',
}

const en: Dictionary = {
  'nav.signIn': 'Sign in',
  'nav.logOut': 'Log out',
  'nav.loggingOut': 'Logging out…',
  'nav.authUnavailable': 'Sign-in state unavailable',
  'nav.appearance': 'Appearance',
  'nav.language': 'Language',
  'theme.system': 'Auto',
  'theme.light': 'Light',
  'theme.dark': 'Dark',

  'home.tagline': 'Property in Uzbekistan. This build covers the sign-in slice.',
  'home.signedInAs': 'Signed in as {name}.',
  'home.viewProfile': 'View your profile',
  'home.finishSetup': 'Finish setting up your account',
  'home.signInPrompt': 'Sign in to set up your profile.',
  'home.unavailable':
    'We could not reach your account just now. Reload in a moment.',

  'signin.title': 'Sign in',
  'signin.subtitle': 'No password needed. We email you a one-time code.',
  'signin.spamNote': 'No code? Check your spam folder.',
  'signin.step': 'Step {current} of {total}',
  'signin.email': 'Email',
  'signin.send': 'Send code',
  'signin.sending': 'Sending…',
  'signin.sentTo': 'We sent a code to {email}. It is good for 15 minutes.',
  'signin.code': 'Six digit code',
  'signin.continue': 'Continue',
  'signin.checking': 'Checking…',
  'signin.otherEmail': 'Use a different email',

  'onboarding.title': 'Tell us who you are',
  'onboarding.subtitle': 'Your profile shows up next to your listings.',
  'onboarding.intro': 'You need this before you can use HAUZ.',
  'onboarding.firstName': 'First name',
  'onboarding.lastName': 'Last name',
  'onboarding.roleLegend': 'I am a',
  'onboarding.role.property_owner': 'Property Owner',
  'onboarding.role.realtor': 'Realtor',
  'onboarding.roleWarning': 'You cannot change this later.',
  'onboarding.continue': 'Continue',
  'onboarding.saving': 'Saving…',

  'profile.title': 'Your profile',
  'profile.intro': 'This is what other people on HAUZ see.',
  'profile.contactEmail': 'Contact email',
  'profile.contactEmailHint':
    'Optional, and not the address you sign in with. Empty it to remove it.',
  'profile.bio': 'Bio',
  'profile.bioHint': 'Optional. Empty it to remove it.',
  'profile.role': 'Role',
  'profile.roleHint': 'Set when you joined and cannot be changed.',
  'profile.save': 'Save changes',
  'profile.saving': 'Saving…',
  'profile.saved': 'Saved.',
  'profile.loadFailed':
    'We could not load your profile just now. Reload in a moment; you are still signed in.',

  'notFound.title': 'Page not found',
  'notFound.body': 'There is nothing at this address. The link may be out of date.',
  'notFound.home': 'Go home',

  'error.rate_limited': 'Too many attempts. Wait a minute and try again.',
  'error.invalid_code': 'That code is wrong or has expired.',
  'error.expired': 'That code has expired. Enter your email to get a new one.',
  'error.unavailable': 'That did not work. Try again.',
  'error.role_conflict': 'You already have an account with a different role.',
  'error.invalid': 'Check what you entered.',
  'error.not_onboarded': 'Your profile is gone. Sign in again to set it up.',
}

const DICTIONARIES: Record<Locale, Dictionary> = { uz, ru, en }

export type Translate = (key: string, vars?: Record<string, string>) => string

/**
 * Falls back to English rather than to the key, so a missing translation reads
 * as an untranslated app instead of a broken one.
 */
export function translator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale]

  return (key, vars) => {
    const template = dictionary[key] ?? en[key] ?? key
    if (!vars) return template

    return Object.entries(vars).reduce(
      (text, [name, value]) => text.replaceAll(`{${name}}`, value),
      template,
    )
  }
}
