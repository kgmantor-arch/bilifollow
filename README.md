# BiliFollow

BiliFollow is a static frontend for a legitimate community-task and internal-rewards platform. It does not support artificial follows, likes, views, or other engagement manipulation.

## Local preview

Serve this folder with any static web server, then open `index.html`. The app uses the Supabase URL and publishable key in `js/config.js`.

## Database setup

Apply the migrations in this exact order through the Supabase SQL Editor or Supabase CLI:

1. `supabase/migrations/202609030001_secure_task_platform.sql`
2. `supabase/migrations/202609030002_product_completion.sql`
3. `supabase/migrations/202609030003_proofs_moderation.sql`
4. `supabase/migrations/202609030004_full_admin_console.sql`
5. `supabase/migrations/202609030005_site_content_management.sql`
6. `supabase/migrations/202609030006_account_security_hardening.sql`
7. `supabase/migrations/202609030007_admin_member_return_fix.sql`
8. `supabase/migrations/202609030008_reference_id_compatibility.sql`
9. `supabase/migrations/202609030009_full_content_and_contact_controls.sql`

Apply them to a staging project first. They set up RLS, protected RPCs, profiles, transactions, structured tasks, resubmission, profile updates, and notifications. Never add a service-role key to the frontend.

The protected task and proof RPCs also apply basic per-user rate limits. Configure additional Auth rate limits and CAPTCHA in the Supabase dashboard before public launch.

## Optional review email

`supabase/functions/send-review-email` is an optional Resend-based Edge Function template. Set its secrets and sender address only in Supabase; do not put email-provider keys in browser code. It is intentionally not called automatically until an authenticated server-side trigger or webhook is configured.

## Verification

Run:

```text
node tests/internal-consistency.mjs .
```

This verifies internal pages, script paths, the main DOM/JavaScript connections, and that proof submission uses the protected RPC.

## Advertising

Advertising is off by default. In `js/config.js`, set `AD_CONFIG.enabled` to `true`, then add an approved AdSense client ID and banner slot ID for the fixed bottom banner.

For the one-time modal, supply only ad markup from a provider whose policy permits this placement in `popupHtml`. The modal is shown once per browser using local storage and always has a close button; it never automatically opens a new tab or pop-under. Do not place AdSense markup in that modal.

## Full Admin Control Center

After applying migration 4, open `admin.html` as a user whose `profiles.is_admin` is `true`. The control center manages site notices, AdSense banner settings, one-time modal markup, member search, coin adjustments, suspensions, task pause/activation, member notifications, and report moderation. All money, member, and settings changes are enforced by admin-only database functions—not browser permissions.

Migration 9 completes no-code editing for About, Contact, Disclaimer, Privacy, and Terms; adds a moderated contact inbox; and adds administrator-role controls.
