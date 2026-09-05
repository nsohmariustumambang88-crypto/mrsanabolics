import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { SEGMENTS, countAllSegments } from '@/lib/campaigns';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { CampaignCreateForm } from '@/components/admin/campaign-create-form';
import type { SegmentOption } from '@/components/admin/campaign-editor';

/*
  Start a campaign.

  Segment sizes are counted here on the server and handed to the form, so choosing an audience
  shows its size instantly and no request is made per selection. Three segments is three counts;
  that is one round trip's worth of work, not a reason for an endpoint.
*/

export const dynamic = 'force-dynamic';

export default async function AdminNewCampaignPage() {
  await requireAdmin();

  const counts = await countAllSegments();

  const segments: SegmentOption[] = SEGMENTS.map((s) => ({
    key: s.key,
    label: s.label,
    description: s.description,
    count: counts[s.key],
  }));

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>A campaign starts as a draft, always.</strong> Readiness is checked against
              what is stored, so there is nothing to check until you have saved something.
            </p>
            <p className="mb-0">
              <strong>Audiences are drawn from consented subscribers only.</strong> Anyone who has
              unsubscribed is unreachable from here — the condition is built into the query rather
              than applied per screen, so it cannot be forgotten.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Add Campaign</h1>
      <Link href="/admin/campaigns" className="wp-page-title-action">
        Back to campaigns
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <CampaignCreateForm segments={segments} />
    </>
  );
}
