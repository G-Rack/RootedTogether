# Rooted Together — Marketplace Website

A separate Next.js site (not part of the Expo app) that shares the exact
same Supabase project as the mobile app — same login, same database.

## Run it

```
npm install
npm run dev
```

Then open http://localhost:3000

## What's here

- `/` — Homepage / marketplace (public): browse creators and published offerings.
- `/login` — Log In (any existing app account works) / Sign Up (creates a buyer account).
- `/creator/[handle]` — A creator's public storefront (banner, about, offerings).
- `/offering/[id]` — Offering detail. Courses/ebooks/routines get a "Buy Now" Stripe checkout;
  1:1 calls get a real embedded Calendly widget for scheduling.
- `/dashboard` — Creator dashboard (Mothers/Pastors/approved Leaders only): stats, storefront
  branding editor, and the offerings table.
- `/dashboard/upload` — Upload/edit an offering.

## Important notes

- **Payments are real Stripe.** "Buy Now" goes through the `create-checkout-session` Edge Function;
  the `stripe-webhook` function records the purchase. Test vs live is decided only by the Stripe keys
  set as Supabase secrets.
- **Calendly is real.** The call-booking page embeds Calendly's actual widget using whichever
  link the creator pastes into their dashboard.
- **Only approved creators see the Dashboard.** A Mother/Pastor/Leader must have
  `vetting_status = 'Approved'` in Supabase (the same approval the app already uses) before
  `/dashboard` will let them in.
- Sign-ups from this site go through the same `submit-signup` Edge Function join.html and the
  app use, so an account created here logs into the app too, and vice versa.
