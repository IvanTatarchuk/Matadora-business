# Backlog — production-стабільність Matadora

Складено за результатами перевірки production-стану 2026-07-04.
Формат: **[Пріоритет]** Опис — статус/деталі.

## 🔴 Критично

1. ~~Stripe webhook відсутній~~ **ОНОВЛЕНО 2026-07-04: перевірено live-режим
   через Vercel production ключ (тільки читання) — webhook РЕАЛЬНО
   зареєстрований і активний** (`we_1ToiEEK0dtidxE85pw50F6LC`,
   `https://matadora.business/api/stripe/webhook`, подія
   `checkout.session.completed`). Тестовий режим (`whsec_12345` — заглушка,
   0 endpoints) не стосується реальних клієнтів, тому не критично.
   **Залишається неперевіреним**: чи `STRIPE_WEBHOOK_SECRET` у Vercel
   Production точно відповідає signing secret саме цього endpoint — Stripe
   API не повертає secret повторно через GET з міркувань безпеки, це можна
   перевірити тільки вручну в Stripe Dashboard → цей endpoint → "Reveal
   signing secret" і звірити з Vercel env. Понижую пріоритет із 🔴 на 🟡,
   бо інфраструктура на місці, залишається лише звірка одного значення.

2. **`ANTHROPIC_API_KEY` — баланс акаунту вичерпано.**
   Ключ підключено до Vercel Production (2026-07-03), але Anthropic API
   повертає `"Your credit balance is too low"`. AI-аналіз PDF на `/kosztorys`
   не працює, поки не поповнено баланс на console.anthropic.com.

## 🟡 Відсутні фічі (згадані в задачі, не існують у коді)

3. **"Paywall після одного безкоштовного offer"** — такої логіки немає
   ніде в репозиторії (перевірено grep по `paywall`, `free.*offer`,
   `offer_limit` тощо — 0 збігів). Якщо це очікувана бізнес-вимога —
   потрібно спроєктувати й реалізувати з нуля, а не "виправити".

4. **Bricoman PDF→phase classification→order pipeline** — не існує в
   жодному з двох перевірених репозиторіїв (`Matadora-business`,
   `matadora-core`). Немає що "прогнати на реальному прикладі" — це
   нереалізована фіча, не баг.

## 🟢 Перевірено й працює

5. Flow `kosztorys → offer wizard` через `localStorage`
   (`matadora_kosztorys_draft`): поля `stage_name`/`description`/`cost`/
   `order_index` і формат VAT (частка → відсоток) узгоджені між записом
   (`src/app/kosztorys/page.tsx`) і читанням (`offer-wizard.tsx`). Реального
   бага в передачі даних не знайдено.
6. Stripe checkout (live-режим) — перевірено наживо, повертає коректну
   `checkout.session.url`.
7. Головна сторінка й `/kosztorys` — HTTP 200, останній production-деплой
   Ready.
8. Build і typecheck — чисті на поточному `main`.

## 🔵 Технічний борг (не з початкового завдання, знайдено попутно)

9. `npm run lint` зламаний репо-вайд. **Діагностовано детально
   (2026-07-04)**: `@typescript-eslint/eslint-plugin@8.62.1` встановлено
   коректно (єдина копія, `npm ls` чистий, `require()` підтверджує рule
   `no-explicit-any` реально є в пакеті — 134 правила всього), і версія в
   межах офіційно підтримуваного діапазону `eslint-config-next@14.2.35`
   (`^5.4.2 || ^6.0.0 || ^7.0.0 || ^8.0.0`). Помилка "Definition for rule
   ... was not found" відтворюється навіть при прямому `npx eslint`
   (обійшовши обгортку `next lint`) — тобто це не проблема Next.js-обгортки,
   а глибша несумісність у тому, як `.eslintrc.json` (`extends:
   next/core-web-vitals`) підключає правила цього плагіна саме в цій
   комбінації версій. Не блокує деплой (`ignoreDuringBuilds: true`), QA
   трактує лінт як інформативний. Наступний крок для того, хто продовжить:
   спробувати мігрувати на flat config (`eslint.config.mjs`) замість
   легасі `.eslintrc.json`, або відкотити `eslint-config-next` до патч-версії
   ближчої за часом виходу до Next 14.2.21 (до апгрейду), а не 14.2.35.
10. Локальний `.env.local` має неузгоджені Stripe-ключі: `STRIPE_SECRET_KEY`
    тестовий (`sk_test_...`), а `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` —
    живий (`pk_live_...`). Не впливає на production (там свої, окремі
    ключі у Vercel — перевірено, це справжній робочий live-ключ), але
    зламає оплату при `npm run dev` локально. Не зміг виправити сам:
    Stripe API навмисно не дозволяє програмно отримати publishable-ключ
    (тільки secret-ключ, яким я вже маю доступ) — потрібно вручну взяти
    `pk_test_...` зі Stripe Dashboard → Developers → API keys → Test mode
    і вставити в `.env.local` замість поточного `pk_live_...`.
11. Windsurf локально додав 20 нових міграцій (0031-0050: месенджер,
    сповіщення, інвентар, workflows, CRM тощо) паралельно з роботою в цій
    сесії — усі застосовані до бази й збираються чисто, але не
    рев'юїлись через звичайний PR-конвеєр (Розробник→QA→Мерджер), бо
    йдуть напряму в `main` через локальний автобекап.

## Не виконано з початкового завдання

- Пункт 5 (Bricoman pipeline) — неможливо виконати, фіча не існує (див. #4
  вище).
