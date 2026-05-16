# EloInvestor v38 - Thawani Payment Gateway

## What was added

- Thawani checkout session API route:
  - `POST /api/payments/thawani/create-session`
- Payment verification API route:
  - `POST /api/payments/thawani/verify`
- Webhook receiver:
  - `POST /api/payments/thawani/webhook`
- Payment success page:
  - `/[country]/[lang]/payment/success`
- Payment cancel page:
  - `/[country]/[lang]/payment/cancel`
- Promotion checkout now creates a pending promotion request, opens Thawani checkout, and activates the promotion only after payment verification.
- User dashboard now shows a retry payment button for `pending_payment` promotion requests.

## Required environment variables

Add these to `.env.local` and to Vercel Environment Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Thawani UAT
THAWANI_SECRET_KEY=...
NEXT_PUBLIC_THAWANI_PUBLISHABLE_KEY=...
THAWANI_BASE_URL=https://uatcheckout.thawani.om/api/v1
THAWANI_CHECKOUT_URL=https://uatcheckout.thawani.om
NEXT_PUBLIC_SITE_URL=https://eloinvestor.com
```

For production, replace UAT URLs with the production Thawani checkout/API URLs from your Thawani merchant account.

## Required SQL

Run:

```sql
SUPABASE_V38_THAWANI_PAYMENTS.sql
```

## Webhook URL to add in Thawani merchant dashboard

```text
https://eloinvestor.com/api/payments/thawani/webhook
```

## Payment flow

1. User chooses a promotion package.
2. Platform creates `promotion_requests` row with `pending_payment`.
3. Server creates a Thawani checkout session.
4. User pays on Thawani hosted checkout.
5. Success page verifies session status.
6. If paid, platform updates:
   - `payments.status = paid`
   - `promotion_requests.status = active`
   - `promotion_requests.payment_status = paid`
   - project sponsored fields: `is_sponsored`, `sponsored_until`, `sponsor_weight`

