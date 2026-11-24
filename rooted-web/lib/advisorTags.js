// Match tags for the course advisor (/advisor). One entry per published offering, keyed by its id.
// Kept in code, not in the offerings table, so tagging never edits a creator's offering row.
// A new offering with no entry here still appears, scored only by its type and price.
//
//   needs  answers to "What brings you here today?" it serves (first one = best fit)
//   helps  answers to "What would help most right now?"
//   learn  video | reading | person
//   time   t15 | t60 | t120 (weekly time it suits)
//   who    me | group
//   why    one plain sentence on what the buyer receives. Facts from the offering only.
//   pairs  offerings that pair well with it, best step-up first (the upsell is the first one live)

const ID = {
  foundations: '098cc571-24e3-45b4-b6aa-2146ee59986b',
  hearing: '1be447fd-d6aa-49bb-a6b0-ecc057bf2180',
  psalms: '16de68c0-90e8-4d51-9a12-c0d9ac3ad453',
  serve: '07970008-3335-4c37-aa77-62113110aa86',
  smallGroups: '9d8856f0-5e9c-4649-b78d-18aa0b8fa991',
  comeHome: '6c5803ac-1cd8-4871-a02d-fc5164638018',
  letters: 'c4a8a1cd-7cd5-40a9-a763-5b7f71d7f921',
  openDoors: 'ce5f9084-78e9-4a90-b603-531f80e68e23',
  mornings: '27e83129-5957-4f67-a76a-d066ef5881a5',
  conversation: 'bd5afa13-b231-4d9b-ba4f-e7ed54fb2208',
};

export const ADVISOR_TAGS = {
  [ID.foundations]: {
    needs: ['new_faith', 'exploring'], helps: ['clarity', 'plan'], learn: ['video'], time: ['t60', 't120'], who: ['me'],
    why: 'Six short video lessons on what it means to follow Jesus, how to pray, how to read the Bible for yourself and how forgiveness works.',
    pairs: [ID.conversation, ID.mornings, ID.hearing],
  },
  [ID.hearing]: {
    needs: ['hear_god', 'exploring', 'rhythm', 'anxious'], helps: ['clarity', 'comfort'], learn: ['video'], time: ['t60', 't120'], who: ['me'],
    why: 'Seven video lessons on prayer and stillness for women who feel too busy to pray, learning to slow down and listen.',
    pairs: [ID.mornings, ID.conversation, ID.psalms],
  },
  [ID.psalms]: {
    needs: ['anxious'], helps: ['comfort', 'plan'], learn: ['video'], time: ['t60', 't120'], who: ['me'],
    why: 'Eight video lessons, each pairing one Psalm with one practical exercise, so you can bring worry and fear to God honestly.',
    pairs: [ID.conversation, ID.letters, ID.mornings],
  },
  [ID.serve]: {
    needs: ['tired', 'group'], helps: ['comfort', 'plan', 'clarity'], learn: ['video'], time: ['t60', 't120'], who: ['me', 'group'],
    why: 'Five video lessons for volunteers and young leaders on knowing your calling, setting healthy boundaries and building rhythms that last.',
    pairs: [ID.conversation, ID.smallGroups, ID.openDoors],
  },
  [ID.smallGroups]: {
    needs: ['group', 'tired'], helps: ['plan', 'clarity'], learn: ['reading'], time: ['t60', 't120'], who: ['group'],
    why: 'A four-week course for church leaders, delivered as a file: each week has a short teaching, a Bible passage and reflection for your group.',
    pairs: [ID.serve, ID.openDoors],
  },
  [ID.comeHome]: {
    needs: ['anxious', 'exploring', 'new_faith', 'rhythm'], helps: ['comfort', 'plan'], learn: ['reading'], time: ['t15', 't60'], who: ['me'],
    why: 'A free 7-day journey: each day has a scripture, a short reflection, a simple practice, a prayer and journal prompts.',
    pairs: [ID.hearing, ID.psalms, ID.letters],
  },
  [ID.letters]: {
    needs: ['anxious', 'exploring'], helps: ['comfort'], learn: ['reading'], time: ['t15', 't60'], who: ['me'],
    why: 'An ebook of ten letters of comfort and hope for seasons like loneliness, grief, anxiety, anger and searching for purpose.',
    pairs: [ID.psalms, ID.conversation, ID.hearing],
  },
  [ID.openDoors]: {
    needs: ['group'], helps: ['plan'], learn: ['reading'], time: ['t15', 't60'], who: ['group'],
    why: 'A short, practical ebook in six chapters on helping first-time visitors to your church become family, from first impressions to a welcome team.',
    pairs: [ID.smallGroups, ID.serve],
  },
  [ID.mornings]: {
    needs: ['rhythm', 'hear_god', 'anxious'], helps: ['plan', 'comfort'], learn: ['reading'], time: ['t15'], who: ['me'],
    why: 'A 15-minute morning rhythm in six gentle steps: stillness, prayer, scripture, gratitude, intention and blessing.',
    pairs: [ID.hearing, ID.psalms],
  },
  [ID.conversation]: {
    needs: [], helps: ['talk'], learn: ['person'], time: ['t15', 't60', 't120'], who: ['me'],
    why: 'A 30-minute call with your Spiritual Mother, booked at a time that suits you. Bring whatever is on your heart.',
    pairs: [ID.psalms, ID.hearing, ID.foundations],
  },
};
