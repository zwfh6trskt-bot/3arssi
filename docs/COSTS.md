# Costs, limits and paid plans

_Checked November 2026 — prices change; confirm on each provider's pricing page._

| Service | Free plan | Limits that matter for 3ARSSI | When you'd pay |
|---|---|---|---|
| **Supabase** (database, accounts, files) | $0 | 500 MB database per project, 1 GB file storage, 5 GB egress, **2 active free projects per account**, **projects pause after 1 week of inactivity**, **no automatic backups** | **Pro from $25/month** per organisation (includes compute credits; extra projects ≈ $10/month each): no pausing, daily backups, 8 GB disk |
| **Netlify** or **Vercel** (website hosting) | $0 | Monthly bandwidth and build-minute quotas on the free tier; Vercel's free *Hobby* plan is for non-commercial use | Netlify Pro / Vercel Pro (per member/month) when you go commercial or exceed quotas |
| **GitHub** | $0 for private repositories | — | Only for team features |
| **Domain name** (optional, e.g. `3arssi.dz` or `.com`) | — | — | Yearly registration fee; `.dz` domains are registered through the CERIST/NIC.DZ process |
| **Email sending** (account confirmation) | Supabase's built-in sender is rate-limited and meant for testing | — | Use your own SMTP (e.g. a transactional email service) before launch |

### Practical advice
* While testing, a paused free Supabase project just needs *Restore* in the dashboard (data is kept).
* Before a public launch, plan for Supabase Pro (no pausing + backups) and your own SMTP.
* Uploaded images count towards storage: keep portfolio photos under ~1 MB (resize before upload).

Sources: https://supabase.com/pricing · https://supabase.com/docs/guides/platform/billing-faq · https://www.netlify.com/pricing · https://vercel.com/pricing
