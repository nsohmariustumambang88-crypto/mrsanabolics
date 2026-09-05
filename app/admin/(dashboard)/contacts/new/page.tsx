import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { ContactCreateForm } from '@/components/admin/contact-create-form';

/*
  Add a contact by hand.

  Deliberately its own screen rather than a widget on the list, because the warning it carries
  needs room to be read. The one thing that must not happen here is a record that later looks
  like consent, so the form says what it is recording before it asks for anything.
*/

export const dynamic = 'force-dynamic';

export default async function AdminNewContactPage() {
  await requireAdmin();

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Use this for people you already deal with</strong> — someone you met, a
              supplier, a caller. It is a record of a relationship you have, not a way to build a
              list.
            </p>
            <p className="mb-0">
              <strong>It grants no permission to email.</strong> The contact will show as having
              no marketing consent, and there is no way to change that from this side: consent has
              to be given by them, through a form they filled in themselves.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Add Contact</h1>
      <Link href="/admin/contacts" className="wp-page-title-action">
        Back to contacts
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <ContactCreateForm />
    </>
  );
}
