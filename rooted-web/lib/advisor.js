import { ADVISOR_TAGS } from './advisorTags';

// Rule-based scoring for the course advisor. No AI, no outside calls: the live catalogue comes from
// the advisor_catalogue() database function and is scored against the visitor's answers here.

export const QUESTIONS = [
  {
    key: 'need',
    title: 'What brings you here today?',
    options: [
      { value: 'new_faith', label: 'I am new to faith, or coming back to it' },
      { value: 'anxious', label: 'I feel anxious or overwhelmed' },
      { value: 'hear_god', label: 'I want to hear God more clearly' },
      { value: 'tired', label: 'I serve or lead, and I am tired' },
      { value: 'group', label: 'I lead a small group or church team' },
      { value: 'rhythm', label: 'I want a simple daily rhythm with God' },
      { value: 'exploring', label: 'I am just exploring' },
      { value: 'hurting', label: 'I am hurting badly and struggling to cope' },
    ],
  },
  {
    key: 'who',
    title: 'Who is this for?',
    options: [
      { value: 'me', label: 'Me' },
      { value: 'group', label: 'My group or church' },
    ],
  },
  {
    key: 'time',
    title: 'How much time can you give each week?',
    options: [
      { value: 't15', label: 'About 15 minutes' },
      { value: 't60', label: 'About an hour' },
      { value: 't120', label: 'A couple of hours' },
    ],
  },
  {
    key: 'learn',
    title: 'How do you like to learn?',
    options: [
      { value: 'video', label: 'Short videos' },
      { value: 'reading', label: 'Reading at my own pace' },
      { value: 'person', label: 'Talking with a real person' },
    ],
  },
  {
    key: 'help',
    title: 'What would help most right now?',
    options: [
      { value: 'comfort', label: 'Comfort' },
      { value: 'clarity', label: 'Clarity and understanding' },
      { value: 'plan', label: 'A simple plan to follow' },
      { value: 'talk', label: 'Someone to talk to' },
    ],
  },
  {
    key: 'ready',
    title: 'Where are you at today?',
    options: [
      { value: 'looking', label: 'Just looking for now' },
      { value: 'small', label: 'I would like to start small' },
      { value: 'full', label: 'I am ready for a full course' },
    ],
  },
];

// The answers that mean "show the care note, not a sale".
export function needsCare(answers) {
  return answers?.need === 'hurting';
}

const NEED_PHRASE = {
  new_faith: 'you are new to faith or coming back to it',
  anxious: 'you are feeling anxious or overwhelmed',
  hear_god: 'you want to hear God more clearly',
  tired: 'you serve or lead and you are tired',
  group: 'you lead a small group or church team',
  rhythm: 'you want a simple daily rhythm with God',
  exploring: 'you are exploring',
};
const HELP_PHRASE = {
  comfort: 'comfort', clarity: 'clarity', plan: 'a simple plan to follow', talk: 'someone to talk to',
};
const LEARN_PHRASE = { video: 'short videos', reading: 'reading at your own pace', person: 'talking with a real person' };
const TIME_PHRASE = { t15: 'about 15 minutes a week', t60: 'about an hour a week', t120: 'a couple of hours a week' };

// What the buyer actually receives. Anything that would arrive empty is never recommended.
export function deliverable(o) {
  if (!o) return false;
  if (o.type === 'call') return !!o.has_calendly;
  return (o.ready_video_lessons || 0) > 0 || !!o.has_file;
}

export function format(o) {
  if (o.type === 'call') return 'person';
  return (o.ready_video_lessons || 0) > 0 ? 'video' : 'reading';
}

function tagsFor(o) {
  return ADVISOR_TAGS[o.id] || { needs: [], helps: o.type === 'call' ? ['talk'] : [], learn: [format(o)], time: ['t60'], who: ['me'], why: '', pairs: [] };
}

export function scoreOffering(o, a) {
  const t = tagsFor(o);
  const price = Number(o.price_cents || 0);
  let s = 0;
  if (t.needs[0] === a.need) s += 10;
  else if (t.needs.includes(a.need)) s += 6;
  if (t.helps.includes(a.help)) s += 4;
  if (a.help === 'talk' && o.type === 'call') s += 4;
  if (t.learn.includes(a.learn)) s += 4;
  if (a.learn === 'person' && o.type === 'call') s += 3;
  if (t.time.includes(a.time)) s += 2;
  if (t.who.includes(a.who)) s += 3;
  else s -= 5;
  if (a.ready === 'looking') {
    if (price === 0) s += 4;
    if (o.free_preview) s += 3;
    if (price > 3000) s -= 2;
  } else if (a.ready === 'small') {
    if (price > 0 && price <= 1500) s += 3;
    if (o.free_preview) s += 2;
    if (price > 3000) s -= 2;
  } else if (a.ready === 'full') {
    if (o.type === 'course' && (o.ready_video_lessons || 0) > 0) s += 3;
    if (price === 0 || price <= 1500) s -= 1;
  }
  return s;
}

// One or two sentences on why it fits, using the visitor's own answers. Facts only.
export function whyItFits(o, a) {
  const t = tagsFor(o);
  const parts = [];
  if (NEED_PHRASE[a.need] && t.needs.includes(a.need)) {
    parts.push(`You said ${NEED_PHRASE[a.need]}${t.helps.includes(a.help) ? `, and that ${HELP_PHRASE[a.help]} would help most` : ''}.`);
  } else if (t.helps.includes(a.help)) {
    parts.push(`You said ${HELP_PHRASE[a.help]} would help most.`);
  }
  if (t.why) parts.push(t.why);
  if (t.learn.includes(a.learn) && t.time.includes(a.time)) {
    parts.push(`It suits ${LEARN_PHRASE[a.learn]} and ${TIME_PHRASE[a.time]}.`);
  }
  return parts.join(' ');
}

export function pairLine(o) {
  return tagsFor(o).why || '';
}

// Lead pick, up to two alternates, one step-up upsell, and a free first step when the lead is not free.
export function recommend(catalogue, a) {
  const list = (catalogue || []).filter(deliverable);
  if (list.length === 0) return null;
  const scored = list.map((o) => ({ o, s: scoreOffering(o, a) })).sort((x, y) => y.s - x.s || Number(x.o.price_cents) - Number(y.o.price_cents));
  const lead = scored[0].o;

  const pairs = tagsFor(lead).pairs || [];
  const live = new Map(list.map((o) => [o.id, o]));
  const upsellId = pairs.find((id) => id !== lead.id && live.has(id));
  const upsell = upsellId ? live.get(upsellId) : null;

  const alternates = scored
    .filter(({ o, s }) => o.id !== lead.id && o.id !== upsell?.id && s >= 6)
    .slice(0, 2)
    .map(({ o }) => o);

  // Real specials only: a free Lesson 1 preview, or a free item, as the gentle first step.
  let freeStep = null;
  if (!lead.free_preview && Number(lead.price_cents) > 0) {
    const free = scored.filter(({ o }) => o.id !== lead.id && (o.free_preview || Number(o.price_cents) === 0) && tagsFor(o).who.includes(a.who));
    if (free.length) freeStep = free[0].o;
  }
  return { lead, upsell, alternates, freeStep };
}

// Any published item with the free preview switched on, for the thank-you screen.
export function previewItem(catalogue, rec) {
  if (rec?.lead?.free_preview) return rec.lead;
  if (rec?.freeStep?.free_preview) return rec.freeStep;
  return (catalogue || []).find((o) => o.free_preview && deliverable(o)) || null;
}
