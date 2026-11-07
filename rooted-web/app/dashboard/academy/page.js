'use client';

import Link from 'next/link';
import { useSession } from '@/components/SessionProvider';
import ProBadge from '@/components/ProBadge';
import ProUpgradeBanner from '@/components/ProUpgradeBanner';
import TypeIcon from '@/components/TypeIcon';
import { OFFERING_TYPE_BY_KEY } from '@/lib/offeringTypes';
import { ALL_ITEMS, lessonStepKeys, lessonMinutes } from '@/lib/academy';
import useAcademyProgress from '@/lib/useAcademyProgress';

function TickBox({ on }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 18, height: 18, borderRadius: 5, flex: '0 0 auto', boxSizing: 'border-box',
        border: on ? '1.5px solid var(--brown)' : '1.5px solid #D9C7AE',
        background: on ? 'var(--brown)' : '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      }}
    >
      {on && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      )}
    </span>
  );
}

function LessonCard({ lesson, done, ready }) {
  const meta = OFFERING_TYPE_BY_KEY[lesson.icon];
  const keys = lessonStepKeys(lesson);
  const count = keys.filter((k) => done.has(k)).length;
  const complete = count === keys.length;
  const unit = lesson.chapters ? 'chapters' : 'steps';
  return (
    <Link href={`/dashboard/academy/${lesson.slug}`} className="rt-card" aria-label={`${lesson.cardTitle}. ${count} of ${keys.length} ${unit} done.`}>
      {lesson.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lesson.cover} alt="" style={{ display: 'block', width: '100%', aspectRatio: '16 / 8', objectFit: 'cover' }} />
      ) : (
        <div
          aria-hidden="true"
          style={{ aspectRatio: '16 / 8', display: 'grid', placeItems: 'center', background: meta?.tint || '#F1E4D3', color: meta?.ink || '#6B4226' }}
        >
          <TypeIcon name={lesson.icon} size={38} />
        </div>
      )}
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="type-pill" style={{ alignSelf: 'flex-start' }}>{lesson.pill} · {lessonMinutes(lesson)} MIN</span>
        <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{lesson.cardTitle}</div>
        <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{lesson.cardSubtitle}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', gap: 5 }} aria-hidden="true">
            {keys.map((k) => <TickBox key={k} on={done.has(k)} />)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: complete ? 'var(--brown)' : 'var(--text-soft)' }}>
            {!ready ? ' ' : complete ? `All ${unit} done` : `${count} of ${keys.length} ${unit} done`}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AcademyPage() {
  const { session, isPro } = useSession();
  const { done, loaded } = useAcademyProgress(session, isPro);

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <div className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--brown)' }}>Academy</div>
        {isPro && <ProBadge />}
      </div>
      <div className="muted" style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 640, marginBottom: 22 }}>
        Short lessons to help you build and grow your storefront. Open one to watch the video, download the template and take the actions.
      </div>

      {!isPro && <div style={{ marginBottom: 22 }}><ProUpgradeBanner title="The Academy is part of Creator Pro" /></div>}

      <div className="grid-cards">
        {ALL_ITEMS.map((l) => (
          isPro ? (
            <LessonCard key={l.slug} lesson={l} done={done} ready={loaded} />
          ) : (
            <div key={l.slug} className="rt-card" style={{ opacity: 0.85 }}>
              {l.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.cover} alt="" style={{ display: 'block', width: '100%', aspectRatio: '16 / 8', objectFit: 'cover' }} />
              ) : (
                <div aria-hidden="true" style={{ aspectRatio: '16 / 8', display: 'grid', placeItems: 'center', background: '#F1E4D3', color: '#6B4226' }}>
                  <TypeIcon name={l.icon} size={38} />
                </div>
              )}
              <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className="type-pill" style={{ alignSelf: 'flex-start' }}>{l.pill} · {lessonMinutes(l)} MIN</span>
                <div className="serif" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{l.cardTitle}</div>
                <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{l.cardSubtitle}</div>
              </div>
            </div>
          )
        ))}
      </div>

      <div className="muted" style={{ fontSize: 13, marginTop: 18 }}>More lessons will appear here as they are added.</div>
    </div>
  );
}
