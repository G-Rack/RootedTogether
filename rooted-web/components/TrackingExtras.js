'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { rememberAttribution, sendMeta } from '@/lib/tracking';

// Two small jobs, nothing shown:
//  1. Keeps the ad tags (utm_source, utm_medium, utm_campaign) from the address, so the quiz and
//     checkout can pass them on (see getAttribution in lib/tracking.js).
//  2. Tells the Meta pixel about every page the visitor moves to inside the site. The pixel only
//     counts the first page by itself, because pages here change without a full reload.
export default function TrackingExtras() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    rememberAttribution();
  }, []);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    sendMeta('PageView');
  }, [pathname]);

  return null;
}
