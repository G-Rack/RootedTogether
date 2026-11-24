'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useSession } from '@/components/SessionProvider';

// rootedtogether.club/insights: what visitors do on the site, from our own analytics
// (site_events, via the analytics_report() database function). Admins only.

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');
const th = { textAlign: 'left', padding: '8px 10px', fontSize: 14, color: 'var(--text-soft)', borderBottom: '1px solid rgba(107,66,38,0.15)', whiteSpace: 'nowrap' };
const td = { padding: '8px 10px', fontSize: 15, borderBottom: '1px solid rgba(107,66,38,0.08)', verticalAlign: 'top' };

function Table({ title, note, cols, rows }) {
  return (
    <section className="card" style={{ padding: 18, marginTop: 18, overflowX: 'auto' }}>
      <h2 className="serif" style={{ fontSize: 20, color: 'var(--brown)', margin: '0 0 4px' }}>{title}</h2>
      {note && <p className="muted" style={{ fontSize: 15, margin: '0 0 10px' }}>{note}</p>}
      {rows.length === 0 ? <p className="muted" style={{ fontSize: 15 }}>No data yet.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{cols.map((c) => <th key={c.key} style={th}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{cols.map((c) => <td key={c.key} style={td}>{c.render ? c.render(r) : (r[c.key] ?? '–')}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// Plain-English pointers from the numbers. Rules only; nothing is guessed.
function pointers(r) {
  const out = [];
  const f = r.funnel || {};
  if (f.sessions >= 20) {
    if (f.viewed_an_offering / f.sessions < 0.3) out.push(`Only ${pct(f.viewed_an_offering, f.sessions)} of visits reach an offering page. Make the path from your landing pages to a course shorter and clearer.`);
    if (f.viewed_an_offering >= 10 && f.clicked_buy / f.viewed_an_offering < 0.05) out.push(`People view offerings but few press Buy (${pct(f.clicked_buy, f.viewed_an_offering)}). Look at price, the first lines of the description, and the free preview.`);
    if (f.clicked_buy >= 5 && f.purchased / f.clicked_buy < 0.3) out.push(`Many Buy clicks do not end in a purchase (${pct(f.purchased, f.clicked_buy)} finish). Check the checkout step on a phone yourself.`);
  }
  (r.landing_pages || []).filter((l) => l.sessions >= 10 && l.bounced / l.sessions > 0.7)
    .slice(0, 3).forEach((l) => out.push(`${l.path} loses ${pct(l.bounced, l.sessions)} of visitors without a single click. It needs a clearer first screen or button.`));
  (r.offerings || []).filter((o) => o.views >= 15 && o.buy_clicks === 0)
    .slice(0, 3).forEach((o) => out.push(`"${o.title}" had ${o.views} views and no Buy clicks.`));
  (r.top_pages || []).filter((p) => p.views >= 15 && p.avg_scroll_pct !== null && p.avg_scroll_pct < 35)
    .slice(0, 3).forEach((p) => out.push(`On ${p.path} most people stop before a third of the page (average ${p.avg_scroll_pct}% scrolled). Move the important part higher.`));
  const best = (r.sources || []).filter((s) => s.sessions >= 10).sort((a, b) => b.purchased / b.sessions - a.purchased / a.sessions)[0];
  if (best && best.purchased > 0) out.push(`Best-converting traffic: ${best.source} / ${best.campaign} (${pct(best.purchased, best.sessions)} of visits bought).`);
  if (out.length === 0) out.push('Not enough visits yet for clear pointers. They appear once there are at least 20 visits.');
  return out;
}

export default function InsightsClient() {
  const { session, loading } = useSession();
  const [days, setDays] = useState(30);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    supabase.rpc('analytics_report', { p_days: days }).then(({ data, error: err }) => {
      if (!active) return;
      if (err) { setError('This page is for Rooted Together admins only.'); setReport(null); }
      else { setError(''); setReport(data); }
    });
    return () => { active = false; };
  }, [session, days]);

  if (loading) return <div className="container" style={{ paddingBlock: 48 }}><div className="skeleton" style={{ height: 240 }} /></div>;
  if (!session) {
    return (
      <div className="container" style={{ paddingBlock: 48, fontSize: 16 }}>
        Please <Link href="/login?next=/insights" style={{ fontWeight: 700, textDecoration: 'underline' }}>log in</Link> to see insights.
      </div>
    );
  }

  const t = report?.totals || {};
  const f = report?.funnel || {};
  const s = report?.sales || {};
  const funnelRows = report ? [
    { step: 'Visits', n: f.sessions, of: '' },
    { step: 'Viewed an offering', n: f.viewed_an_offering, of: pct(f.viewed_an_offering, f.sessions) },
    { step: 'Pressed Buy', n: f.clicked_buy, of: pct(f.clicked_buy, f.viewed_an_offering) },
    { step: 'Started checkout', n: f.started_checkout, of: pct(f.started_checkout, f.clicked_buy) },
    { step: 'Purchased (seen on site)', n: f.purchased, of: pct(f.purchased, f.started_checkout) },
    { step: 'Signed up', n: f.signed_up, of: pct(f.signed_up, f.sessions) },
  ] : [];

  return (
    <div style={{ background: 'var(--cream)' }}>
      <div className="container" style={{ paddingBlock: '36px 80px', maxWidth: 1080 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 className="serif" style={{ fontSize: 32, color: 'var(--brown)', margin: 0 }}>Insights</h1>
          <div role="group" aria-label="Time range" style={{ display: 'flex', gap: 8 }}>
            {[7, 30, 90].map((d) => (
              <button key={d} type="button" className={`btn btn-small ${days === d ? 'btn-primary' : 'btn-outline'}`} aria-pressed={days === d} onClick={() => setDays(d)} style={{ fontSize: 15 }}>
                Last {d} days
              </button>
            ))}
          </div>
        </div>

        {error && <div className="error-banner" role="alert" style={{ marginTop: 18, fontSize: 16 }}>{error}</div>}
        {!report && !error && <div className="skeleton" style={{ height: 200, marginTop: 18 }} />}

        {report && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginTop: 18 }}>
              {[
                ['Visitors', t.visitors], ['Visits', t.sessions], ['Page views', t.page_views],
                ['Pages per visit', t.pages_per_session ?? '–'], ['Left without a click', t.bounce_rate_pct != null ? `${t.bounce_rate_pct}%` : '–'],
                ['Minutes per visit', t.avg_minutes ?? '–'], ['Orders (real)', s.orders], ['Revenue (real)', `$${Number(s.revenue_usd || 0).toFixed(2)}`],
              ].map(([k, v]) => (
                <div key={k} className="card" style={{ padding: 14 }}>
                  <div className="muted" style={{ fontSize: 14 }}>{k}</div>
                  <div className="serif" style={{ fontSize: 26, fontWeight: 700, color: 'var(--brown)' }}>{v ?? 0}</div>
                </div>
              ))}
            </div>

            <section className="card" style={{ padding: 18, marginTop: 18 }}>
              <h2 className="serif" style={{ fontSize: 20, color: 'var(--brown)', margin: '0 0 8px' }}>What to look at</h2>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 16, lineHeight: 1.6 }}>
                {pointers(report).map((p) => <li key={p}>{p}</li>)}
              </ul>
            </section>

            <Table title="Sales funnel" note="How far visits get. Each % is of the step above. Orders and revenue in the boxes above come from real purchases, not this funnel."
              cols={[{ key: 'step', label: 'Step' }, { key: 'n', label: 'Visits' }, { key: 'of', label: 'Of step above' }]} rows={funnelRows} />

            <Table title="Where visitors come from" note="By the ad tags on the link (utm_source / utm_campaign)."
              cols={[{ key: 'source', label: 'Source' }, { key: 'campaign', label: 'Campaign' }, { key: 'sessions', label: 'Visits' },
                { key: 'viewed_offering', label: 'Viewed offering' }, { key: 'clicked_buy', label: 'Pressed Buy' }, { key: 'purchased', label: 'Bought' }]}
              rows={report.sources || []} />

            <Table title="Offerings" cols={[{ key: 'title', label: 'Offering' }, { key: 'views', label: 'Page views' }, { key: 'buy_clicks', label: 'Buy clicks' },
              { key: 'orders', label: 'Orders' }, { key: 'revenue_usd', label: 'Revenue', render: (r) => `$${Number(r.revenue_usd || 0).toFixed(2)}` }]}
              rows={report.offerings || []} />

            <Table title="Pages" note="Scroll = how far down people get on average. Time = average time on the page."
              cols={[{ key: 'path', label: 'Page' }, { key: 'views', label: 'Views' }, { key: 'visitors', label: 'Visitors' },
                { key: 'avg_scroll_pct', label: 'Scroll', render: (r) => (r.avg_scroll_pct != null ? `${r.avg_scroll_pct}%` : '–') },
                { key: 'avg_seconds', label: 'Time', render: (r) => (r.avg_seconds != null ? `${r.avg_seconds}s` : '–') }]}
              rows={report.top_pages || []} />

            <Table title="Most clicked" cols={[{ key: 'label', label: 'Button or link' }, { key: 'target', label: 'Goes to' }, { key: 'path', label: 'On page' }, { key: 'clicks', label: 'Clicks' }]}
              rows={report.top_clicks || []} />

            <Table title="First page of a visit" cols={[{ key: 'path', label: 'Page' }, { key: 'sessions', label: 'Visits' },
              { key: 'bounced', label: 'Left without a click', render: (r) => `${r.bounced} (${pct(r.bounced, r.sessions)})` }, { key: 'purchased', label: 'Bought' }]}
              rows={report.landing_pages || []} />

            <Table title="Last page of a visit" note="Where people leave." cols={[{ key: 'path', label: 'Page' }, { key: 'sessions', label: 'Visits' }]} rows={report.exit_pages || []} />

            <Table title="Devices" cols={[{ key: 'device', label: 'Device' }, { key: 'sessions', label: 'Visits' }, { key: 'purchased', label: 'Bought' }]} rows={report.devices || []} />

            <Table title="Daily" cols={[{ key: 'day', label: 'Day' }, { key: 'sessions', label: 'Visits' }, { key: 'page_views', label: 'Page views' },
              { key: 'buy_clicks', label: 'Buy clicks' }, { key: 'purchases', label: 'Purchases' }]} rows={[...(report.daily || [])].reverse()} />

            <Table title="All recorded events" cols={[{ key: 'event', label: 'Event' }, { key: 'count', label: 'Count' }]} rows={report.events || []} />
          </>
        )}
      </div>
    </div>
  );
}
