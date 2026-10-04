import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bell, BellOff, Link2Off } from 'lucide-react';
import { setMarketingLink, useMarketingLink } from '@/api/storefront';
import { toast } from '@/store/ui';
import { Button } from '@/ui/Button';
import { PageLoader } from '@/ui/PageLoader';
import { BuyerNotice } from './BuyerNotice';

/**
 * Where the link at the foot of every broadcast lands. Stopping takes one tap
 * and no code: withdrawing consent has to be as easy as giving it was.
 */
export default function UnsubscribePage() {
  const { token = '' } = useParams();
  const { data, isLoading, isError } = useMarketingLink(token);
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <PageLoader />;
  if (isError || !data) {
    return (
      <BuyerNotice
        icon={<Link2Off className="size-5" />}
        title="This link is not valid"
        message="It may have been cut short. Open it again from the message, or reply STOP to the shop on WhatsApp."
      />
    );
  }

  const on = optedIn ?? data.optedIn;
  const business = { name: data.store };
  const change = async (optIn: boolean) => {
    setBusy(true);
    try {
      const res = await setMarketingLink(token, optIn);
      setOptedIn(res.optedIn);
    } catch (e) {
      toast('error', 'That did not go through', e instanceof Error ? e.message : 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  // the icon is the buyer's current state: offers on, or off
  return on ? (
    <BuyerNotice
      business={business}
      icon={<Bell className="size-5" />}
      title={`Stop offers from ${data.store}?`}
      message="You won't get offers and new arrivals on WhatsApp any more. Updates about your orders still come through."
      actions={
        <Button loading={busy} onClick={() => change(false)}>
          Stop offers
        </Button>
      }
    />
  ) : (
    <BuyerNotice
      business={business}
      icon={<BellOff className="size-5" />}
      title="Offers stopped"
      message={`${data.store} won't send you offers on WhatsApp. Changed your mind? You can get them again.`}
      actions={
        <Button variant="secondary" loading={busy} onClick={() => change(true)}>
          Send me offers again
        </Button>
      }
    />
  );
}
