import ServiceRequestForm from '@/components/ServiceRequestForm';

export const metadata = {
  title: 'Special Request — Rooted Together',
};

export default function SpecialRequestPage() {
  return <ServiceRequestForm serviceKey="special" />;
}
