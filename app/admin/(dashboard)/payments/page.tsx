import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpPageHeader, WpPostbox, WpStaticNotice } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import {
  PaymentMethodsTable,
  type PaymentMethodRow,
} from '@/components/admin/payment-methods-table';

/*
  Payments.

  NO PAYMENT RAIL IS CONNECTED ON THIS BUILD. Nothing is charged, no card details are
  transmitted, and enabling a method here only controls whether it is LISTED at checkout. The
  notice at the top of the screen is permanent and not dismissible, because the one thing an
  administrator could believe about this screen that would cost real money is that turning a
  method on turned payment on.

  The Cash App row carries the $Cashtag customers pay (walletAddress) and the name that account
  shows (accountName), set in the database at the owner's direction in November 2026. Neither can
  be edited on this screen: a tag that is wrong or somebody else's sends customers' money to an
  unrecoverable destination, so it is changed deliberately, never through a text box.
*/

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  await requireAdmin();

  const methods = await prisma.paymentMethod.findMany({
    orderBy: [{ position: 'asc' }, { label: 'asc' }],
  });

  const rows: PaymentMethodRow[] = methods.map((m) => ({
    id: m.id,
    key: m.key,
    label: m.label,
    notice: m.notice,
    walletAddress: m.walletAddress,
    accountName: m.accountName,
    enabled: m.enabled,
    connected: m.connected,
  }));

  const listed = rows.filter((r) => r.enabled).length;

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>What the toggle does.</strong> It decides whether a method appears as an
              option at checkout. It does not connect anything, and it cannot: no processor,
              merchant account or wallet exists behind this build.
            </p>
            <p>
              <strong>What the notice does.</strong> Each method&rsquo;s sentence is shown inside
              its own panel, at the moment a customer picks it — not on a confirmation screen
              afterwards. It cannot be left empty.
            </p>
            <p className="mb-0">
              <strong>Why the $Cashtag cannot be typed here.</strong> It is shown to customers as
              where to send money. If it were wrong, or stale, or somebody else&rsquo;s, the money
              would be gone and irreversible, so it is changed deliberately in the database, never
              in a text box on a settings screen.
            </p>
          </div>
        }
      />

      <WpPageHeader
        title="Payments"
        subtitle={`${rows.length} method${rows.length === 1 ? '' : 's'}, ${listed} listed at checkout.`}
      />

      <WpStaticNotice tone="warning">
        <strong>No payment rail is connected. Nothing is ever charged.</strong> There is no
        processor, no merchant account and no wallet behind this build. Enabling a method below
        only controls whether it is <em>listed</em> at checkout — it does not make that method
        able to take money, and no order recorded here has been paid for.
      </WpStaticNotice>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <PaymentMethodsTable rows={rows} />
        </div>

        <div className="space-y-5">
          <WpPostbox title="Where Cash App money goes">
            <p className="mt-0 text-[13px]">
              Cash App orders are paid to the $Cashtag shown under Cash App in the table, and the
              customer sees the name beside it in their app. After paying they upload a
              screenshot, which appears on the order. Check the money arrived before confirming.
            </p>
            <p className="text-[13px]">
              There is no box here to change the $Cashtag. It is changed in the database, on
              purpose, by someone who has checked it.
            </p>
            <p className="text-[13px]">
              A payment destination shown to a customer is money leaving their hands and not
              coming back. An address typed here that is nobody&rsquo;s — or, worse, somebody
              else&rsquo;s — is the most expensive mistake this page could make, and it would look
              entirely plausible while it was happening. On-chain transfers and wallet pushes are
              irreversible: there is no chargeback to fall back on.
            </p>
            <p className="mb-0 text-[13px]">
              Connecting a rail is a deliberate engineering change, made against a real merchant
              account with credentials held outside the database — not a value someone pastes into
              a settings screen.
            </p>
          </WpPostbox>

          <WpPostbox title="Before a rail could be connected">
            <ul className="m-0 list-disc space-y-1.5 pl-4 text-[13px]">
              <li>A merchant account that has accepted this catalogue.</li>
              <li>Credentials held in the environment, never in a database column.</li>
              <li>
                A server-side confirmation path, so &ldquo;paid&rdquo; is something the processor
                says and not something a screen asserts.
              </li>
              <li>
                Payment fields on the <span className="wp-num">Order</span> model, which it does
                not have today precisely so that no screen can claim an order was paid.
              </li>
            </ul>
          </WpPostbox>
        </div>
      </div>
    </>
  );
}
