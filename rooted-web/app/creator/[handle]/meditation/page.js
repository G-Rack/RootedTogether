import ServiceRequestForm from '@/components/ServiceRequestForm';

export const metadata = {
  title: 'Meditation Request — Rooted Together',
};

export default function MeditationRequestPage() {
  return <ServiceRequestForm serviceKey="meditation" />;
}
