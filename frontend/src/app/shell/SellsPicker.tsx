import type { Sells } from '@/api/types';
import { Tabs } from '@/ui/Tabs';

const choices: { value: Sells; label: string; hint: string }[] = [
  { value: 'products', label: 'Products', hint: 'Things you pack and send. Buyers order, pay and track them.' },
  {
    value: 'services',
    label: 'Services',
    hint: 'Things you do: trips, events, repairs, classes, bookings. Buyers enquire and you follow up with a price.',
  },
  { value: 'both', label: 'Both', hint: 'Orders for what you ship and enquiries for what you do, side by side.' },
];

/** What the business offers. It words the app and the assistant; it never hides anything already listed. */
export function SellsPicker({ value, onChange }: { value: Sells; onChange: (value: Sells) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-hi">What do you sell?</p>
      <Tabs className="w-fit max-w-full" value={value} onChange={onChange} tabs={choices} />
      <p className="mt-1.5 text-xs leading-relaxed text-low">{choices.find((c) => c.value === value)?.hint}</p>
    </div>
  );
}
