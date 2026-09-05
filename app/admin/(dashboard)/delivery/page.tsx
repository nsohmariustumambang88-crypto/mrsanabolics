import { requireAdmin } from '@/lib/auth';
import { formatEstimate, listDeliveryZones } from '@/lib/delivery';
import { WpStaticNotice } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { DeliveryManager, type ZoneRow } from '@/components/admin/delivery-manager';

/*
  Delivery zones and rates.

  Two states on this screen are checked here rather than left for someone to notice:

  - No active catch-all zone. That means any customer outside the named countries is offered no
    delivery method at all and cannot finish an order — a shop that is quietly closed to most of
    the world. It is invisible in the zone list, because the absence of a row is exactly what it
    looks like, so it gets a warning.

  - A country named by two active zones. Only one of them can serve it (the earlier by order), so
    the other is a rule that looks live and is not. That is how a rate somebody carefully set up
    ends up never being offered.

  Both are computed on the server from the same list the manager renders, so they cannot describe
  a different table from the one below them.
*/

export const dynamic = 'force-dynamic';

export default async function AdminDeliveryPage() {
  await requireAdmin();

  const zones = await listDeliveryZones();

  const rows: ZoneRow[] = zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    countries: zone.countries,
    active: zone.active,
    position: zone.position,
    rates: zone.rates.map((rate) => ({
      id: rate.id,
      name: rate.name,
      price: rate.price,
      minSubtotal: rate.minSubtotal,
      freeOverSubtotal: rate.freeOverSubtotal,
      estimateMinDays: rate.estimateMinDays,
      estimateMaxDays: rate.estimateMaxDays,
      active: rate.active,
      position: rate.position,
      /* Rendered once, on the server, so the table and a quote never phrase it differently. */
      estimate: formatEstimate(rate),
    })),
  }));

  const activeZones = zones.filter((zone) => zone.active);
  const catchAlls = activeZones.filter((zone) => zone.countries.length === 0);

  /* Which countries more than one active zone claims, and who claims them. */
  const claims = new Map<string, string[]>();
  for (const zone of activeZones) {
    for (const country of zone.countries) {
      claims.set(country, [...(claims.get(country) ?? []), zone.name]);
    }
  }
  const contested = Array.from(claims.entries()).filter(([, names]) => names.length > 1);

  /* An active zone with no active rate offers nothing, which reads on the list as "working". */
  const emptyZones = activeZones.filter((zone) => !zone.rates.some((rate) => rate.active));

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>How a zone is chosen.</strong> The first active zone that names the
              customer&rsquo;s country wins. If none names it, the catch-all zone — the one with an
              empty country list — takes it. If there is no catch-all, that customer is offered no
              delivery at all.
            </p>
            <p>
              <strong>How a rate is offered.</strong> Inactive rates never appear. A rate with a
              minimum basket is hidden below it rather than shown greyed out. A rate whose
              &ldquo;free over&rdquo; the basket meets is offered at no charge, with its ordinary
              price struck through.
            </p>
            <p className="mb-0">
              <strong>Use Preview before you trust a change.</strong> It asks the same function the
              storefront asks, so it shows what a customer would actually see rather than what the
              table appears to say.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Delivery</h1>
      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <p className="wp-subtitle m-0 mb-3">
        Where orders can be sent, what it costs, and how long it takes.
      </p>

      {catchAlls.length === 0 && (
        <WpStaticNotice tone="warning">
          <strong>No active catch-all zone.</strong> Anyone in a country none of the zones below
          names is offered no delivery method, so they cannot complete an order. Add a zone and
          leave its country list empty, or activate an existing one.
        </WpStaticNotice>
      )}

      {catchAlls.length > 1 && (
        <WpStaticNotice tone="warning">
          <strong>{catchAlls.length} active catch-all zones.</strong> Only{' '}
          <strong>{catchAlls[0].name}</strong> is ever used — the rest are unreachable. Give the
          others country lists, or deactivate them.
        </WpStaticNotice>
      )}

      {contested.length > 0 && (
        <WpStaticNotice tone="warning">
          <strong>Some countries are claimed twice.</strong> Only the first zone in order serves
          each of them; the other is never used.{' '}
          {contested
            .slice(0, 6)
            .map(([country, names]) => `${country} (${names.join(', ')})`)
            .join('; ')}
          {contested.length > 6 && ` and ${contested.length - 6} more`}.
        </WpStaticNotice>
      )}

      {emptyZones.length > 0 && (
        <WpStaticNotice tone="warning">
          <strong>
            {emptyZones.map((zone) => zone.name).join(', ')}{' '}
            {emptyZones.length === 1 ? 'is active but has' : 'are active but have'} no active
            delivery option.
          </strong>{' '}
          Customers matched to{' '}
          {emptyZones.length === 1 ? 'that zone' : 'those zones'} are offered nothing.
        </WpStaticNotice>
      )}

      <DeliveryManager zones={rows} />
    </>
  );
}
