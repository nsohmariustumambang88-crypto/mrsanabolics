'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { SettingDef } from '@/lib/settings';
import { saveSettings } from '@/app/admin/settings-actions';
import { runAction } from '@/components/admin/run-action';
import { cn } from '@/lib/utils';

/*
  The settings form, driven entirely by the registry in lib/settings.ts.

  Nothing about a field is written here — label, help, type and default all come from the
  declaration, so adding a setting is one entry in that file and it appears on this screen with
  the right control. Hard-coding a field here is how the two drift and a setting ends up saved
  under a key nothing reads.

  `SettingDef` is imported as a TYPE ONLY. lib/settings.ts starts with `import 'server-only'`;
  a value import from a client component would be a build error. A type import is erased before
  the bundler ever sees it.

  The hidden `__fields` input names the declared keys this form actually rendered. The action
  writes only those. Without it, /admin/email — which shows the email group and one General
  field — would post nothing for `announcement_text` and the server could not tell "not on this
  screen" from "cleared by the person", so saving the email screen would blank the announcement
  bar. It also settles the checkbox case: an unticked box sends nothing at all.
*/

export type SettingsGroup = {
  title: string;
  /** One sentence under the group heading. What this group changes, and where it shows. */
  description?: string;
  fields: SettingDef[];
};

export function SettingsForm({
  groups,
  values,
  submitLabel = 'Save changes',
}: {
  groups: SettingsGroup[];
  values: Record<string, string>;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  const manifest = groups.flatMap((g) => g.fields.map((f) => f.key)).join(',');

  /*
    onSubmit + new FormData(event.currentTarget). This is React 18: <form action={clientFn}> is
    a React 19 feature and here it fails silently — the button looks like it worked and no row
    is written. Every admin form in this build uses this shape.
  */
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    setBusy(true);
    setNotice(null);

    const result = await runAction(() => saveSettings(data));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: 'Settings saved.' });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <input type="hidden" name="__fields" value={manifest} />

      {notice && (
        <div
          className={cn('wp-notice', notice.ok ? 'wp-notice-success' : 'wp-notice-error')}
          role={notice.ok ? 'status' : 'alert'}
        >
          <p>{notice.text}</p>
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <section className="wp-postbox" key={group.title}>
            <div className="wp-postbox-header">
              <h2 className="wp-postbox-title">{group.title}</h2>
            </div>

            <div className="wp-postbox-inside">
              {group.description && (
                <p className="wp-muted mt-0 max-w-[46rem] text-[13px]">{group.description}</p>
              )}

              <table className="w-full border-collapse text-left">
                <tbody>
                  {group.fields.map((field) => (
                    <SettingRow key={field.key} field={field} value={values[field.key] ?? ''} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <p className="mt-4">
        <button type="submit" className="wp-button wp-button-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </p>
    </form>
  );
}

/* --------------------------------------------------------------------- row */

/*
  WordPress's .form-table is a two-column table that stacks below its own breakpoint. It is
  reproduced with utilities rather than added to wp-admin.css because that sheet is a
  transcription of the real one, and this is the only screen that needs the shape.

  783px, not Tailwind's md (768). The whole admin switches at 783 — mixing the two strands
  controls in a 15px band where the layout has already changed and the field has not.
*/
function SettingRow({ field, value }: { field: SettingDef; value: string }) {
  const id = `setting-${field.key}`;

  return (
    <tr className="block border-b border-[#f0f0f1] last:border-b-0 min-[783px]:table-row">
      <th
        scope="row"
        className="block pt-4 pr-4 align-top text-[13px] font-normal min-[783px]:table-cell min-[783px]:w-[15rem]"
      >
        <label htmlFor={id}>{field.label}</label>
      </th>

      <td className="block pb-4 align-top min-[783px]:table-cell min-[783px]:pt-4">
        <div className="max-w-[30rem]">
          <SettingControl id={id} field={field} value={value} />
          <p className="wp-muted mb-0 mt-1.5 text-[12px]">{field.help}</p>
        </div>
      </td>
    </tr>
  );
}

function SettingControl({
  id,
  field,
  value,
}: {
  id: string;
  field: SettingDef;
  value: string;
}) {
  switch (field.type) {
    case 'boolean':
      return (
        <input
          id={id}
          name={field.key}
          type="checkbox"
          value="true"
          defaultChecked={value === 'true'}
        />
      );

    case 'number':
      return (
        <input
          id={id}
          name={field.key}
          type="number"
          min={0}
          step={1}
          defaultValue={value}
          className="wp-input wp-input-narrow"
        />
      );

    case 'longtext':
      return (
        <textarea
          id={id}
          name={field.key}
          rows={4}
          defaultValue={value}
          className="wp-textarea"
        />
      );

    case 'email':
      return (
        <input
          id={id}
          name={field.key}
          type="email"
          defaultValue={value}
          className="wp-input"
          placeholder="name@domain.com"
        />
      );

    default:
      return (
        <input id={id} name={field.key} type="text" defaultValue={value} className="wp-input" />
      );
  }
}
