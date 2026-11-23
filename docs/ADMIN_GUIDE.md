# Admin guide

The dashboard is at **`/admin`** (also reachable from *Profile* for editors and admins).
It works on a phone (section tabs at the top) and on a computer (sidebar).

Roles:
* **Editor** — manages all content (events, categories, providers, prices, translations, regions).
* **Administrator** — everything an editor can do, plus users/roles and removing demo content.

Roles are enforced by the database, not only by the interface.

## 1. Create the first administrator

1. Open the website and create a normal account (*Profile → Create account*) with your email. Confirm the email if asked.
2. In Supabase → **SQL Editor**, run (with your email):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Sign out and in again; open `/admin`.
4. Further editors/admins: *Admin → Users & roles*.

In demo mode (no Supabase), use *“Open admin with the demo account”* on `/admin`.

## 2. Everyday tasks

Every text field has **AR / FR / EN** tabs. Each language is saved separately;
a red dot marks a missing required translation. Only fields you change are written.

| I want to… | Go to | How |
|---|---|---|
| Add an event | Events → *Add event* | Name in each language, who it's for (bride/groom/both), icon |
| Rename / reorder / hide an event | Events | ✏️ edit · ↑↓ order · 👁 show/hide |
| Duplicate an event with all its categories | Events → ⧉ | Creates “(copy)”, then edit it |
| Delete an event | Events → 🗑 | Prefer hiding: deleting removes its categories and guidance (users' budgets stay) |
| Add a category | Events → open event → *Add category* | Choose side; you land on its editor |
| Add a subcategory | open event → **＋** on the category row | |
| Edit description, icon, image, linked provider services | open the category | *Related provider services* decides which providers and price items users see |
| Add a checklist item, tip, suggestion, tradition, note or image | category editor → *Add item* | Type, importance (essential / optional / varies by region + wilaya), text, image |
| Preview in a language | category editor → *Preview* | Uses the current interface language |
| Add a provider | Providers → *Add provider* | Name, main service, at least one contact, location; save, then add photos, offers, prices |
| Upload portfolio photos/videos | provider page → *Upload photo or video* (or paste a URL) | Reorder ↑↓; ✏️ for captions |
| Feature / verify a provider | provider form toggles | Only mark *verified* after checking yourself |
| Add a service type (e.g. “Tbal troupe”) | Services → *Add service type* | Optionally group under another type |
| Add prices | Prices → *Add price item*, then *+ Add price* | See below |
| Edit interface text (buttons, labels…) | Translations → *Interface text* | Override per language; empty = default |
| Find untranslated content | Translations → *Content missing* or Overview | Click to open the item |
| Add a wilaya or commune | Regions | Wilaya code + names; communes under each wilaya |
| Remove fictional sample data | Demo content | Only `is_demo` rows are deleted |
| Give someone a role | Users & roles | Select user / editor / administrator |

## 3. Prices — rules that keep estimates honest

* A **price item** is ONE comparable thing with ONE unit, e.g. *“Traditional
  oriental cakes — per piece”*. If a package differs (e.g. “hall with
  catering” vs “hall only”), create **separate items**.
* A **price record** is a low–high price for that item, from a provider or a
  named source, with a wilaya, the date of the price, optional minimum
  quantity, conditions and possible extra costs, and *indicative* or *confirmed*.
* Users' estimates combine only records of the same item → units always match.
* Use the unit **custom quote** for things that cannot be priced; users then see
  “Price unavailable · request a quote”.
* Prices older than 12 months are flagged on the Overview and Prices pages — update or hide them.
* Never enter invented prices as real. Fictional demo prices are flagged `is_demo`.

## 4. Regional and family differences

Mark guidance that is not universal as **Varies by region** and, if it belongs
to one wilaya, select it. Users see it labelled (e.g. “Regional · Tlemcen”).
Users can always hide, rename and add their own events and categories.
