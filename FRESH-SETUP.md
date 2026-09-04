# BiliFollow — Fresh Setup

Use a **new Supabase project** for a clean database. Do not put a Supabase secret/service-role key in this frontend.

## 1. Create a new Supabase project

1. Create a new project in Supabase and wait until it is ready.
2. Open **Connect** (or **Settings → API Keys**).
3. Copy the **Project URL** and the **Publishable key** (`sb_publishable_...`).
4. Open `js/config.js` and replace only:

```js
const SUPABASE_URL = "YOUR_NEW_PROJECT_URL";
const SUPABASE_KEY = "YOUR_NEW_PUBLISHABLE_KEY";
```

Never paste an `sb_secret_...` key or a service-role key into this project.

## 2. Apply database SQL

Open the Supabase **SQL Editor**. Open each file below, copy its **contents** (not the filename), paste it in SQL Editor, and click **Run**. Run exactly in this order:

1. `supabase/migrations/202609030001_secure_task_platform.sql`
2. `supabase/migrations/202609030002_product_completion.sql`
3. `supabase/migrations/202609030003_proofs_moderation.sql`
4. `supabase/migrations/202609030004_full_admin_console.sql`
5. `supabase/migrations/202609030005_site_content_management.sql`
6. `supabase/migrations/202609030006_account_security_hardening.sql`
7. `supabase/migrations/202609030007_admin_member_return_fix.sql`
8. `supabase/migrations/202609030008_reference_id_compatibility.sql`
9. `supabase/migrations/202609030009_full_content_and_contact_controls.sql`
10. `supabase/migrations/202609030010_homepage_control.sql`

## 3. Create the first admin

1. Deploy the site, open `register.html`, and create your own account.
2. In Supabase SQL Editor run this, replacing the email:

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com');
```

3. Sign out and sign in again. Open `admin.html`.

## 4. Control Center

From `admin.html` you can manage homepage text, public pages, footer, notices, member coins/status/roles, tasks, reports, contact inbox, AdSense banner settings, and sponsor popup content.

For ads, first enable Ads in Control Center, then add your approved AdSense client ID and banner slot ID. The sponsor popup accepts a title, plain message, button label, and only an `https://` link.

## 5. Tawk.to live chat

Your Tawk widget is already configured globally in `js/config.js`. After deployment it appears once on every page. Reply to visitors from the Tawk dashboard or Tawk mobile app.

## 6. Cloudflare Pages deployment

This is a static HTML project.

1. Upload the **contents** of this folder to the root of a new GitHub repository.
2. In Cloudflare: **Workers & Pages → Create application → Pages → Connect to Git**.
3. Select the repository and `main` as the production branch.
4. Set Framework preset to **None**.
5. Leave Build command empty. Set the root/output directory to the repository root.
6. Save and Deploy.

After deployment, open the site in an incognito window and test: Home, register, login, dashboard, `admin.html`, Tawk chat, a public-page edit, and an ad setting.
