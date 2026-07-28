# Skin Hub Clinic — Admin & Booking System Design

> Mobile-first clinic management for Dr. Prateek Tiwari (Skin Hub, Ujjain)  
> Stack: **Next.js 15** + **MongoDB** + **Secure Server APIs**

---

## 1. System Overview (Flow Diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SCENARIO A: Patient books online (website / mobile)                      │
└─────────────────────────────────────────────────────────────────────────┘
   Patient selects service + date + 15-min slot
              │
              ▼
   Server checks: cutoff 7:30 PM? slot free? daily limit?
              │
              ▼
   MongoDB saves booking + queue entry + token number
              │
              ├──► WhatsApp link to patient (confirmation)
              ├──► Shows on staff "Today" tab
              └──► Slot marked BOOKED (others can't pick it)

┌─────────────────────────────────────────────────────────────────────────┐
│ SCENARIO B: Walk-in patient at clinic (staff on phone)                   │
└─────────────────────────────────────────────────────────────────────────┘
   Patient arrives without booking
              │
              ▼
   Staff opens /admin → Walk-in tab → name + phone (~10 sec)
              │
              ▼
   Auto token # assigned → added to live queue
              │
              ├──► WhatsApp: "Your token is #8. Wait ~35 min"
              ├──► Patient sees /queue page (updates every 8 sec)
              └──► Staff taps "Next Patient" → doctor sees name

┌─────────────────────────────────────────────────────────────────────────┐
│ SCENARIO C: No-show / Cancel                                             │
└─────────────────────────────────────────────────────────────────────────┘
   Staff marks "No-show" OR cancels booking
              │
              ▼
   Slot re-opens in MongoDB → available for new online booking
```

---

## 2. Why These Tech Choices?

| Choice | Reason |
|--------|--------|
| **Next.js App Router** | SEO for clinic website + API routes on same server |
| **MongoDB Atlas** | Cloud database, free tier, works great from mobile admin |
| **Server API routes** | All logic + PINs stay on server — never in browser |
| **HTTP-only JWT cookie** | Staff/Doctor stay logged in 12h without exposing PIN |
| **Separate Staff & Doctor PIN** | Reception can't change booking limits or delete records |
| **Polling (8 sec)** | Simple, fast, no WebSocket setup — good for small clinic |
| **WhatsApp links** | No Twilio cost initially — opens wa.me with pre-filled text |

### Security — "Server code encrypted, not visible on frontend"

- PIN values live only in `.env.local` (never in React code)
- Old hardcoded `"9827"` removed from admin page
- JWT signed with `AUTH_SECRET` — cookie is httpOnly (JavaScript can't read it)
- MongoDB URI never sent to browser
- Doctor-only actions checked on server (`role === 'doctor'`)

---

## 3. File Structure (Zip-style naming)

```
Skin-Hub Clinic/
├── .env.example                 ← Copy to .env.local
├── app/
│   ├── admin/page.tsx           ← Login → Staff or Doctor dashboard
│   ├── booking/page.tsx         ← Public booking form
│   ├── queue/page.tsx           ← Public live queue
│   └── api/
│       ├── auth/login/route.ts  ← PIN verify + session cookie
│       ├── appointments/
│       │   ├── route.ts         ← Create/list bookings
│       │   ├── slots/route.ts   ← Available 15-min slots
│       │   └── update/route.ts  ← Cancel / no-show / arrived
│       ├── queue/
│       │   ├── route.ts         ← Public queue snapshot
│       │   ├── walk-in/route.ts ← Staff adds walk-in
│       │   └── next/route.ts    ← "Next Patient" button
│       ├── settings/route.ts    ← Doctor: max bookings, block slots
│       └── blogs/route.ts       ← Doctor: CMS blogs
├── components/
│   └── admin/
│       ├── AdminLogin.tsx       ← Role + PIN screen
│       ├── StaffDashboard.tsx   ← Mobile bottom tabs
│       ├── DoctorDashboard.tsx  ← Schedule / Settings / Blogs
│       ├── WalkInForm.tsx       ← Quick walk-in entry
│       ├── QueueControls.tsx    ← Next patient + live list
│       └── AppointmentsList.tsx ← Today's bookings cards
├── lib/
│   ├── mongodb.ts               ← DB connection (server only)
│   ├── auth.ts                  ← Session + PIN verify (server only)
│   ├── slots.ts                 ← 15-min slot logic + 7:30 PM cutoff
│   ├── types.ts                 ← Shared TypeScript types
│   └── db/
│       ├── bookings.ts
│       ├── queue.ts
│       ├── settings.ts
│       └── blogs.ts
└── config/site.ts               ← Clinic name, WhatsApp, services
```

---

## 4. Booking Rules (Your Requirements)

| Rule | Implementation |
|------|----------------|
| 15-minute slots | `lib/slots.ts` generates 9:00, 9:15, 9:30… |
| Morning + evening hours | 9 AM–2 PM and 5 PM–9 PM |
| Daily patient limit | Doctor sets in Settings (default 32) |
| 7:30 PM cutoff | Same-day online booking closes at 7:30 PM |
| Booked slot disabled | UI greys out; server rejects double booking |
| No-show frees slot | Status `no-show` excluded from slot count |
| Cancel re-opens slot | Status `cancelled` → slot available again |

---

## 5. Admin Panels (Mobile UI)

### Staff Panel (`/admin` → Staff PIN)

Bottom tabs:
1. **Queue** — Current token, waiting count, "Next Patient" button
2. **Walk-in** — Name + phone → token in 10 seconds
3. **Today** — Appointments list, mark Arrived / No-show / Cancel

### Doctor Panel (`/admin` → Doctor PIN)

Bottom tabs:
1. **Schedule** — Today's full list + queue overview
2. **Settings** — Max bookings/day, block slots (lunch break)
3. **Blogs** — Write & publish SEO articles

---

## 6. Setup From Zero (Beginner Steps)

### Step 1: MongoDB Atlas (free)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster → Database Access → add user + password
3. Network Access → Allow from anywhere (0.0.0.0/0) for dev
4. Copy connection string

### Step 2: Environment file
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```
MONGODB_URI=mongodb+srv://your-user:your-pass@cluster.mongodb.net/
STAFF_PIN=4821
DOCTOR_PIN=7392
AUTH_SECRET=any-long-random-string-min-16-chars
```

### Step 3: Run locally
```bash
npm install
npm run dev
```
- Website: http://localhost:3000
- Admin: http://localhost:3000/admin
- Queue: http://localhost:3000/queue
- Booking: http://localhost:3000/booking

### Step 4: Test flow
1. Login as Staff (PIN from .env.local)
2. Add walk-in → see token
3. Tap "Next Patient"
4. Open /queue in another tab → see update within 8 sec
5. Login as Doctor → change max bookings to 20
6. Book online from /booking → pick 15-min slot

---

## 7. MongoDB Collections

| Collection | Stores |
|------------|--------|
| `bookings` | All appointments (online + walk-in) |
| `queue_entries` | Token queue per day |
| `daily_queue` | Current token, wait time, broadcast message |
| `clinic_settings` | Max bookings, blocked slots, cutoff time |
| `blogs` | CMS articles |

---

## 8. Real-Time Updates

- Public `/queue` page polls `/api/queue` every **8 seconds**
- Staff dashboard polls every **8 seconds**
- No WebSocket needed for a single clinic — simple & reliable

Future upgrade: MongoDB Change Streams + SSE if you need instant (<1s) updates.

---

## 9. WhatsApp Notifications

Currently: **wa.me links** (free, no API key)

| Event | Who gets message |
|-------|------------------|
| Online booking | Patient (confirm) + optional doctor alert |
| Walk-in registered | Patient ("Token #8, wait ~35 min") |

Future: Twilio WhatsApp API + cron for 1-day & 1-hour reminders (as in your diagram).

---

## 10. Deploy Checklist

1. Set all env vars on Vercel/hosting dashboard
2. Use strong PINs (not 4821/7392)
3. MongoDB Atlas → restrict IP to server IP in production
4. `AUTH_SECRET` must be unique per environment
5. Test admin on mobile Chrome — add to home screen (PWA-like)

---

## 11. FAQ (Your Doubts Answered)

**Q: Doctor has no laptop — can they manage everything on phone?**  
Yes. `/admin` is mobile-first with bottom navigation. Doctor uses Schedule, Settings, Blogs tabs.

**Q: Walk-in patient — how does staff enter?**  
Staff tab → Walk-in → name + phone → token auto-assigned. Patient gets WhatsApp link.

**Q: How many patients in clinic right now?**  
Queue tab shows waiting count + full list. Public `/queue` page shows same data.

**Q: Why morning booking + 7:30 PM cutoff?**  
Prevents late same-day bookings that cause no-shows. Patients book fixed 15-min slots; if they don't come, staff marks no-show and slot reopens.

**Q: Is PIN visible in browser inspect?**  
No. PIN goes to `/api/auth/login` once; server sets httpOnly cookie. PIN is not stored in React state after login.

---

*Built for Skin Hub Clinic, Freeganj, Ujjain — Dr. Prateek Tiwari*
