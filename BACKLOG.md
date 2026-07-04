# Backlog — production-стабільність Matadora

Складено за результатами перевірки production-стану 2026-07-04.
Формат: **[Пріоритет]** Опис — статус/деталі.

## 🔴 Критично

1. **Stripe webhook: 0 зареєстрованих endpoints у тестовому режимі.**
   `STRIPE_WEBHOOK_SECRET=whsec_12345` у `.env.local` — це заглушка
   (реальний секрет Stripe завжди довгий випадковий рядок), і Stripe API
   підтверджує: жодного webhook endpoint не зареєстровано для тестового
   ключа. Перевірити НЕ вдалось для live-режиму (немає доступу до live
   secret key з цієї сесії — навмисно, за правилом "не чіпати Stripe-конфіг
   без дозволу"). **Ризик**: якщо так само і в live — після оплати клієнта
   `checkout.session.completed` ніколи не долетить, і
   `kosztorys_purchases.status` ніколи не стане `paid`, попри те, що клієнт
   реально заплатив.
   **Дія власника**: перевірити в Stripe Dashboard → Developers → Webhooks,
   чи є endpoint на `https://matadora.business/api/stripe/webhook` з подією
   `checkout.session.completed`, і чи `STRIPE_WEBHOOK_SECRET` у Vercel
   Production відповідає реальному "Signing secret" з цього endpoint.

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

9. `npm run lint` зламаний репо-вайд через конфлікт версій
   `eslint-config-next`/`@typescript-eslint` — не блокує деплой
   (`ignoreDuringBuilds: true`), але лінт зараз не дає жодного реального
   сигналу. Потребує окремого розбору версій `@typescript-eslint/*`.
10. Локальний `.env.local` має неузгоджені Stripe-ключі: `STRIPE_SECRET_KEY`
    тестовий (`sk_test_...`), а `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` —
    живий (`pk_live_...`). Не впливає на production (там свої, окремі
    ключі у Vercel), але зламає `npm run dev` локально, якщо хтось спробує
    пройти оплату вダев-режимі.
11. Windsurf локально додав 20 нових міграцій (0031-0050: месенджер,
    сповіщення, інвентар, workflows, CRM тощо) паралельно з роботою в цій
    сесії — усі застосовані до бази й збираються чисто, але не
    рев'юїлись через звичайний PR-конвеєр (Розробник→QA→Мерджер), бо
    йдуть напряму в `main` через локальний автобекап.

## Не виконано з початкового завдання

- Пункт 5 (Bricoman pipeline) — неможливо виконати, фіча не існує (див. #4
  вище).
