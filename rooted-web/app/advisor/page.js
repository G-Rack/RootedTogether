import AdvisorClient from './AdvisorClient';

export const metadata = {
  title: 'Find your next step — Rooted Together',
  description: 'Answer six short questions and we will suggest a course, ebook, routine or call from the Rooted Together marketplace that fits where you are.',
  openGraph: {
    title: 'Find your next step — Rooted Together',
    description: 'Six short questions, one gentle suggestion. Under 90 seconds.',
    type: 'website',
  },
};

export default function AdvisorPage() {
  return <AdvisorClient />;
}
