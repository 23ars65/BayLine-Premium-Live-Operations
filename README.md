# BayLine — Vehicle Service Center Booking System

A full-stack vehicle service booking app built on **React + TypeScript** (frontend) and **Supabase/PostgreSQL** (backend). It now ships with a full public marketing site — animated hero, service catalog, a live map of every service center, customer testimonials, and a no-login "get a quote" enquiry form — in front of the booking app itself. Customers sign in to book service slots; staff run a live "bay board." Any change on either side — a customer booking a slot, staff advancing a job's status — **reflects instantly on every connected screen** via Supabase Realtime, with the database itself (not app code) preventing two bookings from double-booking the same bay/time.

**What's new in this pass:**
- Fixed two bugs in `schema.sql` that made it fail to run in Supabase's SQL editor: helper functions that queried `profiles` before that table existed, and a malformed `services` seed insert with mismatched column counts. Verified by running the full script against a real Postgres instance with zero errors.
- **20 service centers across 14 Indian states** (Maharashtra, Delhi, Haryana, Karnataka, Tamil Nadu, West Bengal, Telangana, Gujarat, Rajasthan, Uttar Pradesh, Chandigarh, Kerala, Madhya Pradesh, Bihar) — `branches` now has a `state` column, and both the homepage map and the booking flow have a **state filter** so people can pick a center anywhere in the country, not just nearby ones.
- A full landing page (`/`) with scroll animations (Framer Motion), a hero section, animated stat counters, a services grid, a "why us" section, testimonials, and a footer — all reachable without logging in.
- An **interactive map** (Leaflet + OpenStreetMap, no API key required) showing every branch; clicking a card highlights its pin and vice versa. It auto-fits to whichever state you've filtered to.
- A public **enquiry / "get a quote" form** collecting the fields real dealer sites ask for (name, phone, email, car make/model/year, registration number, service needed, preferred branch & date, message) — stored in a new `enquiries` table anyone can submit to, but only staff/admin can read.

```
vehicle-service-booking/
├── supabase/
│   └── schema.sql        ← run this in Supabase's SQL editor first
└── frontend/              ← React + Vite + TypeScript + Tailwind app
```

---

## 1. Set up Supabase (5 minutes)

1. Go to [supabase.com](https://supabase.com) → create a free account → **New Project**.
2. Once it's provisioned, open **SQL Editor → New query**.
3. Paste the entire contents of `supabase/schema.sql` and click **Run**.
   - This creates all tables, enums, triggers, the conflict-prevention constraint, RLS policies, a reporting view, and seeds 2 branches + 6 services.
4. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Set up the frontend

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Run it:
```bash
npm run dev
```
Open **http://localhost:5173**.

## 3. Try it out

1. Open **http://localhost:5173** — you'll land on the public homepage. Scroll through the hero, services, the service-center map (click a pin or a card), testimonials, and the enquiry form. Submit the enquiry form with no account — it writes straight into the new `enquiries` table.
2. Click **Sign in** → **Create account** to sign up as a customer (any email/password — Supabase's default email confirmation may be ON; you can disable "Confirm email" under Authentication → Providers → Email for local testing).
3. Add a vehicle under **My Garage**.
4. Go to **Book Service** — pick a branch, service, date, and an open time slot. Availability is computed live from real bookings in the database.
5. **To test the staff/live-sync view:** in the Supabase Table Editor, open `profiles`, find your user row, set `role` to `staff` and `branch_id` to one of the seeded branch IDs (from the `branches` table). Reload the app — you'll land on the **Bay Board**.
6. Open the app in two browser windows: one as the customer, one as staff. Book a slot in one window and watch it appear instantly in the other, with no refresh. Advance the booking through **Confirm → Start Service → Mark Completed** on the staff side and watch the status badge update live on the customer's dashboard.
7. **To see enquiries as staff:** query the `enquiries` table in the Supabase Table Editor (or extend `AdminBoard.tsx` with a small list — the RLS policy already scopes staff to their branch and admins to everything, so the frontend work is just a `select()` + render).

---

## How the "changes reflect both ways" requirement is implemented

- The frontend never talks to a custom backend server — it talks directly to Supabase's auto-generated API over `@supabase/supabase-js`.
- Every write (`insert`/`update`) goes straight into PostgreSQL.
- Each page subscribes to a **Realtime channel** filtered to the rows it cares about, e.g.:
  ```ts
  supabase
    .channel('customer-bookings')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${profile.id}` },
        () => reloadData())
    .subscribe()
  ```
- Supabase Realtime reads PostgreSQL's write-ahead log and pushes matching changes over a WebSocket to every subscribed client — so a change made by staff, by the customer, or directly in the Supabase dashboard all propagate the same way, automatically.
- **Double-booking prevention is enforced by PostgreSQL itself**, not application code: see the `no_overlapping_bay_bookings` `EXCLUDE USING gist` constraint in `schema.sql`. If two customers race for the same bay/time, the second `insert` is rejected by the database with error code `23P01`; the frontend catches this and either retries with the next free bay or tells the user the slot was just taken. This is a genuinely strong thing to highlight in your DBMS report — it's concurrency control enforced at the data layer.

## Key DBMS concepts demonstrated (useful for your report/viva)

| Concept | Where |
|---|---|
| Normalized relational schema (3NF) | `branches`, `bays`, `services`, `vehicles`, `bookings` as separate, foreign-keyed tables |
| Constraints & data integrity | `check` constraints (year range, price ≥ 0, end > start), `unique` constraints |
| Concurrency control | `EXCLUDE USING gist` constraint prevents overlapping bay bookings at the DB level |
| Triggers | Auto-`updated_at`, booking status audit log, bay status sync, auto-create profile on signup |
| Views | `v_bay_board` joins 5 tables into one reporting view for the dashboard |
| Access control / security | Row Level Security policies scoping data by role (customer/staff/admin) and branch |
| Asymmetric RLS (public insert, restricted read) | `enquiries` table: `with check (true)` lets anonymous visitors insert, but `select`/`update` are scoped to staff/admin of the matching branch |
| Real-time replication to clients | Supabase Realtime on `bookings`, `bays` and `enquiries` via PostgreSQL's WAL |
| Geospatial-adjacent data | `branches.latitude`/`longitude` (numeric) rendered on an OpenStreetMap/Leaflet map on the frontend |

## Extending it further
- Add email/SMS reminders via a Supabase **Edge Function** triggered on `booking_status_history` inserts.
- Add a `reviews` table (1 review per completed booking) to demonstrate a 1:1 relationship with a `check` on `status = 'completed'`.
- Add `service_parts` + `inventory` tables to track parts consumed per job — a nice many-to-many extension.
- Swap the manual bay-assignment loop in `NewBooking.tsx` for a Postgres function (`assign_bay(...)`) called via `supabase.rpc()`, moving the assignment logic server-side.
