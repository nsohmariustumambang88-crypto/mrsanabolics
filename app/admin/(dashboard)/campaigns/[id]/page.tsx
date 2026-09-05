import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { SEGMENTS, countAllSegments, readinessProblems } from '@/lib/campaigns';
import {
  CampaignEditor,
  type CampaignView,
  type SegmentOption,
} from '@/components/admin/campaign-editor';

/*
  One campaign.

  The readiness checklist is computed HERE, on the server, against what is actually stored — and
  it is computed again inside setCampaignStatus before READY is granted. Two checks rather than
  one because the screen's copy is a snapshot: the postal address may have been cleared on
  another tab since this page rendered, and a checklist is advice, never the gate.
*/

export const dynamic = 'force-dynamic';

export default async function AdminCampaignPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const campaign = await prisma.campaign.findUnique({ where: { id: params.id } });
  if (!campaign) notFound();

  const [counts, settings] = await Promise.all([countAllSegments(), getSettings()]);

  /* A sent campaign has nothing left to block, and the checklist would only read as a rebuke. */
  const problems =
    campaign.status === 'SENT' ? [] : await readinessProblems(campaign, settings);

  const segments: SegmentOption[] = SEGMENTS.map((s) => ({
    key: s.key,
    label: s.label,
    description: s.description,
    count: counts[s.key],
  }));

  const view: CampaignView = {
    id: campaign.id,
    name: campaign.name,
    subject: campaign.subject,
    body: campaign.body,
    segment: campaign.segment,
    status: campaign.status,
    recipientCount: campaign.recipientCount,
    sentAt: campaign.sentAt?.toISOString() ?? null,
    sentBy: campaign.sentBy,
    sentVia: campaign.sentVia,
  };

  return (
    <>
      <h1 className="wp-heading-inline">{campaign.name}</h1>
      <Link href="/admin/campaigns" className="wp-page-title-action">
        Back to campaigns
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <div className="mb-4">
        <CampaignEditor
          campaign={view}
          segments={segments}
          problems={problems.map((p) => ({
            key: p.key,
            label: p.label,
            href: p.href,
            hrefLabel: p.hrefLabel,
          }))}
        />
      </div>
    </>
  );
}
