'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/format';
import { runAction } from '@/components/admin/run-action';
import {
  createRate,
  createZone,
  deleteRate,
  deleteZone,
  previewDelivery,
  toggleRateActive,
  toggleZoneActive,
  updateRate,
  updateZone,
} from '@/app/admin/delivery-actions';
import type { ActionResult } from '@/app/admin/delivery-actions';

/*
  The delivery screen.

  Every zone is a postbox holding its own rate table, because a zone and its rates are one thing:
  a rate read away from the countries it applies to says nothing. The alternative — one flat table
  of rates with a zone column — was rejected for that reason.

  The Preview panel at the top is the load-bearing control here. A rates table is a set of rules
  that interact (a named zone shadowing the catch-all, a minimum basket hiding an option, a
  free-over threshold zeroing one), and nobody can read four such rules off a table and be sure
  what a customer in Ireland with £180 in the basket sees. Preview asks the same function the
  storefront asks, so the answer is the answer.

  All forms are onSubmit + new FormData(event.currentTarget). This is React 18: <form action={fn}>
  with a client function is React 19 and here it fails silently — the button looks like it worked
  and nothing is written. And every action call goes through runAction, so a Neon cold start comes
  back as a message rather than a button stuck on "Saving…" forever.
*/

export type RateRow = {
  id: string;
  name: string;
  price: number;
  minSubtotal: number | null;
  freeOverSubtotal: number | null;
  estimateMinDays: number | null;
  estimateMaxDays: number | null;
  active: boolean;
  position: number;
  /** Rendered on the server by formatEstimate, so both sides say the same sentence. */
  estimate: string;
};

export type ZoneRow = {
  id: string;
  name: string;
  countries: string[];
  active: boolean;
  position: number;
  rates: RateRow[];
};

type PreviewOption = {
  rateId: string;
  zoneName: string;
  name: string;
  price: number;
  basePrice: number;
  free: boolean;
  estimate: string;
};

type Notice = { ok: boolean; text: string } | null;

/* ------------------------------------------------------------------- bits */

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      className={`wp-notice ${notice.ok ? 'wp-notice-success' : 'wp-notice-error'}`}
      role={notice.ok ? 'status' : 'alert'}
    >
      <p>{notice.text}</p>
    </div>
  );
}

function LinkButton({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline disabled:cursor-default disabled:opacity-60"
      style={danger ? { color: 'var(--wp-error)' } : undefined}
    >
      {children}
    </button>
  );
}

const money = (value: number | null) => (value === null ? '—' : formatPrice(value));

/* ---------------------------------------------------------------- preview */

function PreviewPanel() {
  const [country, setCountry] = React.useState('US');
  const [subtotal, setSubtotal] = React.useState('100');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    country: string;
    subtotal: number;
    zone: { id: string; name: string; isCatchAll: boolean } | null;
    options: PreviewOption[];
  } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const outcome = await runAction(() =>
      previewDelivery({ country, subtotal: Number(subtotal) })
    );
    setBusy(false);

    if (!outcome.ok) {
      setError(outcome.error);
      setResult(null);
      return;
    }

    setResult({
      country: outcome.country,
      subtotal: outcome.subtotal,
      zone: outcome.zone,
      options: outcome.options,
    });
  }

  return (
    <section className="wp-postbox">
      <div className="wp-postbox-header">
        <h2 className="wp-postbox-title">Preview</h2>
      </div>

      <div className="wp-postbox-inside">
        <p className="wp-help mt-0">
          What a customer in this country, with this basket, is offered right now — worked out by
          the same code the storefront uses, not a summary of the table below.
        </p>

        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="preview-country" className="wp-label">
              Country code
            </label>
            <input
              id="preview-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
              placeholder="GB"
              className="wp-input wp-input-narrow mt-1 uppercase"
            />
          </div>

          <div>
            <label htmlFor="preview-subtotal" className="wp-label">
              Basket value
            </label>
            <input
              id="preview-subtotal"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              inputMode="decimal"
              className="wp-input wp-input-narrow mt-1"
            />
          </div>

          <button type="submit" disabled={busy} className="wp-button wp-button-primary">
            {busy ? 'Checking…' : 'Preview'}
          </button>
        </form>

        {error && (
          <div className="wp-notice wp-notice-error mt-3" role="alert">
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4">
            <p className="m-0 text-[13px]">
              <strong>{result.country}</strong> · basket {formatPrice(result.subtotal)} ·{' '}
              {result.zone ? (
                <>
                  matched <strong>{result.zone.name}</strong>
                  {result.zone.isCatchAll && ' (the catch-all zone)'}
                </>
              ) : (
                <span style={{ color: 'var(--wp-error)' }}>no zone covers this country</span>
              )}
            </p>

            {result.options.length === 0 ? (
              <div className="wp-notice wp-notice-warning mt-2">
                <p>
                  Nothing would be offered. This customer cannot choose a delivery method, so they
                  cannot complete an order.
                </p>
              </div>
            ) : (
              <table className="wp-list-table mt-2">
                <thead>
                  <tr>
                    <th scope="col">Option</th>
                    <th scope="col">Price</th>
                    <th scope="col">Estimate</th>
                  </tr>
                </thead>
                <tbody>
                  {result.options.map((option) => (
                    <tr key={option.rateId}>
                      <td>
                        <strong>{option.name}</strong>
                      </td>
                      <td className="wp-num">
                        {option.free ? (
                          <>
                            Free{' '}
                            <span className="wp-muted line-through">
                              {formatPrice(option.basePrice)}
                            </span>
                          </>
                        ) : (
                          formatPrice(option.price)
                        )}
                      </td>
                      <td className="wp-muted">{option.estimate || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- zone fields */

function ZoneFields({ zone, idPrefix }: { zone?: ZoneRow; idPrefix: string }) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-name`} className="wp-label">
          Zone name <span style={{ color: 'var(--wp-error)' }}>*</span>
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={zone?.name ?? ''}
          required
          maxLength={80}
          className="wp-input mt-1"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-countries`} className="wp-label">
          Countries
        </label>
        <input
          id={`${idPrefix}-countries`}
          name="countries"
          defaultValue={zone?.countries.join(', ') ?? ''}
          placeholder="GB, IE, FR"
          className="wp-input mt-1"
        />
        <p className="wp-help">
          Two-letter ISO codes, separated by commas. <strong>Leave this empty</strong> to make the
          zone the catch-all — it then serves everywhere no other zone names, which is how orders
          from unlisted countries get a delivery option at all.
        </p>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-position`} className="wp-label">
          Order
        </label>
        <input
          id={`${idPrefix}-position`}
          name="position"
          type="number"
          min={0}
          max={9999}
          defaultValue={zone?.position ?? 0}
          className="wp-input wp-input-narrow mt-1"
        />
        <p className="wp-help">
          Only breaks ties. A zone that names the country always wins over the catch-all, whatever
          the order says.
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- rate fields */

function RateFields({ rate, idPrefix }: { rate?: RateRow; idPrefix: string }) {
  const num = (value: number | null | undefined) =>
    value === null || value === undefined ? '' : String(value);

  return (
    <>
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor={`${idPrefix}-name`} className="wp-label">
            Option name <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            defaultValue={rate?.name ?? ''}
            required
            maxLength={80}
            className="wp-input mt-1"
          />
          <p className="wp-help">Shown to the customer, e.g. “Standard tracked”.</p>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-price`} className="wp-label">
            Price <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <input
            id={`${idPrefix}-price`}
            name="price"
            defaultValue={rate ? rate.price.toFixed(2) : ''}
            inputMode="decimal"
            required
            className="wp-input wp-input-narrow mt-1"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor={`${idPrefix}-min`} className="wp-label">
            Minimum basket
          </label>
          <input
            id={`${idPrefix}-min`}
            name="minSubtotal"
            defaultValue={rate?.minSubtotal !== null && rate?.minSubtotal !== undefined ? rate.minSubtotal.toFixed(2) : ''}
            inputMode="decimal"
            className="wp-input wp-input-narrow mt-1"
          />
          <p className="wp-help">Below this the option is not offered. Blank for no minimum.</p>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-free`} className="wp-label">
            Free over
          </label>
          <input
            id={`${idPrefix}-free`}
            name="freeOverSubtotal"
            defaultValue={rate?.freeOverSubtotal !== null && rate?.freeOverSubtotal !== undefined ? rate.freeOverSubtotal.toFixed(2) : ''}
            inputMode="decimal"
            className="wp-input wp-input-narrow mt-1"
          />
          <p className="wp-help">At or above this the option costs nothing. Blank for never.</p>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-mindays`} className="wp-label">
            From (days)
          </label>
          <input
            id={`${idPrefix}-mindays`}
            name="estimateMinDays"
            type="number"
            min={1}
            max={365}
            defaultValue={num(rate?.estimateMinDays)}
            className="wp-input wp-input-narrow mt-1"
          />
        </div>

        <div>
          <label htmlFor={`${idPrefix}-maxdays`} className="wp-label">
            To (days)
          </label>
          <input
            id={`${idPrefix}-maxdays`}
            name="estimateMaxDays"
            type="number"
            min={1}
            max={365}
            defaultValue={num(rate?.estimateMaxDays)}
            className="wp-input wp-input-narrow mt-1"
          />
          <p className="wp-help">Working days. Leave both blank to promise nothing.</p>
        </div>

        <div>
          <label htmlFor={`${idPrefix}-position`} className="wp-label">
            Order
          </label>
          <input
            id={`${idPrefix}-position`}
            name="position"
            type="number"
            min={0}
            max={9999}
            defaultValue={rate?.position ?? 0}
            className="wp-input wp-input-narrow mt-1"
          />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------- zone */

function ZonePanel({ zone }: { zone: ZoneRow }) {
  const router = useRouter();
  const [notice, setNotice] = React.useState<Notice>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [editingRate, setEditingRate] = React.useState<string | null>(null);

  const isCatchAll = zone.countries.length === 0;

  async function run(key: string, call: () => Promise<ActionResult>, done: string) {
    setBusy(key);
    setNotice(null);
    const result = await runAction(call);
    setBusy(null);

    if (result.ok) {
      setNotice({ ok: true, text: done });
      router.refresh();
      return true;
    }
    setNotice({ ok: false, text: result.error });
    return false;
  }

  async function onZoneEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run('zone', () => updateZone(zone.id, form), 'Zone saved.');
  }

  async function onAddRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const ok = await run('add-rate', () => createRate(zone.id, form), 'Rate added.');
    if (ok) element.reset();
  }

  async function onEditRate(event: React.FormEvent<HTMLFormElement>, rate: RateRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await run(`rate-${rate.id}`, () => updateRate(rate.id, form), `${rate.name} saved.`);
    if (ok) setEditingRate(null);
  }

  function onDeleteZone() {
    const count = zone.rates.length;
    const tail =
      count === 0
        ? 'It has no rates.'
        : `Its ${count} ${count === 1 ? 'rate' : 'rates'} will be deleted with it.`;
    if (!window.confirm(`Delete the delivery zone “${zone.name}”?\n\n${tail}\n\nThis cannot be undone.`)) {
      return;
    }
    void run('delete-zone', () => deleteZone(zone.id), `${zone.name} deleted.`);
  }

  function onDeleteRate(rate: RateRow) {
    if (!window.confirm(`Delete the delivery option “${rate.name}” from ${zone.name}?`)) return;
    void run(`rate-${rate.id}`, () => deleteRate(rate.id), `${rate.name} deleted.`);
  }

  return (
    <section className="wp-postbox">
      <div className="wp-postbox-header">
        <h2 className="wp-postbox-title">
          {zone.name}
          {!zone.active && (
            <span className="ml-2 text-[11px] font-semibold uppercase wp-muted">Inactive</span>
          )}
        </h2>
        <span className="text-[11px] uppercase wp-muted wp-num">
          {zone.rates.length} {zone.rates.length === 1 ? 'rate' : 'rates'}
        </span>
      </div>

      <div className="wp-postbox-inside">
        <NoticeLine notice={notice} />

        <p className="m-0 text-[13px]">
          {isCatchAll ? (
            <>
              <strong>Catch-all.</strong> Serves every country no other zone names.
            </>
          ) : (
            <>
              <span className="wp-muted">Serves </span>
              <span className="wp-num">{zone.countries.join(', ')}</span>
            </>
          )}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <LinkButton
            onClick={() =>
              void run(
                'toggle-zone',
                () => toggleZoneActive(zone.id, !zone.active),
                zone.active ? `${zone.name} deactivated.` : `${zone.name} activated.`
              )
            }
            disabled={busy === 'toggle-zone'}
          >
            {zone.active ? 'Deactivate' : 'Activate'}
          </LinkButton>
          <span className="wp-muted">|</span>
          <LinkButton onClick={onDeleteZone} disabled={busy === 'delete-zone'} danger>
            {busy === 'delete-zone' ? 'Deleting…' : 'Delete zone'}
          </LinkButton>
        </div>

        {/* ---------------------------------------------------------- rates */}

        <div className="mt-4 overflow-x-auto">
          <table className="wp-list-table min-w-[48rem]">
            <thead>
              <tr>
                <th scope="col">Option</th>
                <th scope="col">Price</th>
                <th scope="col">Free over</th>
                <th scope="col">Minimum basket</th>
                <th scope="col">Estimate</th>
                <th scope="col">Status</th>
              </tr>
            </thead>

            <tbody>
              {zone.rates.map((rate) => (
                <React.Fragment key={rate.id}>
                  <tr>
                    <td>
                      <strong>{rate.name}</strong>
                      <div className="row-actions">
                        <LinkButton
                          onClick={() => setEditingRate(editingRate === rate.id ? null : rate.id)}
                        >
                          {editingRate === rate.id ? 'Close' : 'Edit'}
                        </LinkButton>
                        <span className="sep"> | </span>
                        <LinkButton
                          onClick={() =>
                            void run(
                              `rate-${rate.id}`,
                              () => toggleRateActive(rate.id, !rate.active),
                              rate.active ? `${rate.name} deactivated.` : `${rate.name} activated.`
                            )
                          }
                          disabled={busy === `rate-${rate.id}`}
                        >
                          {rate.active ? 'Deactivate' : 'Activate'}
                        </LinkButton>
                        <span className="sep"> | </span>
                        <span className="delete">
                          <LinkButton
                            onClick={() => onDeleteRate(rate)}
                            disabled={busy === `rate-${rate.id}`}
                            danger
                          >
                            Delete
                          </LinkButton>
                        </span>
                      </div>
                    </td>
                    <td className="wp-num">{formatPrice(rate.price)}</td>
                    <td className="wp-num">{money(rate.freeOverSubtotal)}</td>
                    <td className="wp-num">{money(rate.minSubtotal)}</td>
                    <td className="wp-muted">{rate.estimate || '—'}</td>
                    <td>
                      <span
                        className="text-[11px] font-semibold uppercase"
                        style={{
                          color: rate.active ? 'var(--wp-success)' : 'var(--wp-text-muted)',
                        }}
                      >
                        {rate.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>

                  {editingRate === rate.id && (
                    <tr>
                      <td colSpan={6} style={{ background: '#f6f7f7' }}>
                        <form
                          onSubmit={(event) => onEditRate(event, rate)}
                          className="max-w-[52rem] space-y-4 py-2"
                        >
                          <RateFields rate={rate} idPrefix={`rate-${rate.id}`} />
                          <div className="flex items-center gap-3">
                            <button
                              type="submit"
                              disabled={busy === `rate-${rate.id}`}
                              className="wp-button wp-button-primary"
                            >
                              {busy === `rate-${rate.id}` ? 'Saving…' : 'Save option'}
                            </button>
                            <LinkButton onClick={() => setEditingRate(null)}>Cancel</LinkButton>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {zone.rates.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center">
                    <p className="m-0 font-semibold">No delivery options in this zone.</p>
                    <p className="m-0 mt-1 wp-muted">
                      Until one is added, nobody in these countries can be offered delivery.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------ add a rate */}

        <details className="mt-4 border-t border-[#dcdcde] pt-3">
          <summary className="cursor-pointer text-[13px]">Add a delivery option</summary>
          <form onSubmit={onAddRate} className="mt-3 max-w-[52rem] space-y-4">
            <RateFields idPrefix={`new-rate-${zone.id}`} />
            <button type="submit" disabled={busy === 'add-rate'} className="wp-button wp-button-primary">
              {busy === 'add-rate' ? 'Adding…' : 'Add option'}
            </button>
          </form>
        </details>

        {/* ------------------------------------------------------- edit zone */}

        <details className="mt-2 border-t border-[#dcdcde] pt-3">
          <summary className="cursor-pointer text-[13px]">Edit zone</summary>
          <form onSubmit={onZoneEdit} className="mt-3 max-w-[36rem] space-y-4">
            <ZoneFields zone={zone} idPrefix={`zone-${zone.id}`} />
            <button type="submit" disabled={busy === 'zone'} className="wp-button wp-button-primary">
              {busy === 'zone' ? 'Saving…' : 'Save zone'}
            </button>
          </form>
        </details>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- add zone */

function AddZonePanel() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => createZone(form));
    setBusy(false);

    if (result.ok) {
      element.reset();
      setNotice({ ok: true, text: 'Zone added.' });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <section className="wp-postbox">
      <div className="wp-postbox-header">
        <h2 className="wp-postbox-title">Add a zone</h2>
      </div>

      <div className="wp-postbox-inside">
        <NoticeLine notice={notice} />
        <form onSubmit={onSubmit} className="max-w-[36rem] space-y-4">
          <ZoneFields idPrefix="new-zone" />
          <button type="submit" disabled={busy} className="wp-button wp-button-primary">
            {busy ? 'Adding…' : 'Add zone'}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- screen */

export function DeliveryManager({ zones }: { zones: ZoneRow[] }) {
  return (
    <div className="space-y-4">
      <PreviewPanel />
      {zones.map((zone) => (
        <ZonePanel key={zone.id} zone={zone} />
      ))}
      <AddZonePanel />
    </div>
  );
}
