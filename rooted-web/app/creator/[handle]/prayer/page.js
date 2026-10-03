import ServiceRequestForm from '@/components/ServiceRequestForm';

export const metadata = {
  title: 'Daily Prayer Request — Rooted Together',
};

export default function PrayerRequestPage() {
  return <ServiceRequestForm serviceKey="prayer" />;
}
