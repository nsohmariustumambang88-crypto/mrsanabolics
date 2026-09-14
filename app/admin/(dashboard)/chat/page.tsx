import { requireAdmin } from '@/lib/auth';
import { CHAT_FILTERS, isChatFilter, listConversations, staffThread } from '@/lib/chat';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { ChatInbox } from '@/components/admin/chat-inbox';

/*
  Live Chat: the conversations visitors start from the chat button on the storefront.

  Server-rendered first, so the screen is useful before any JavaScript runs, then kept live by the
  inbox component: the open thread refreshes every few seconds and the list beside it a little
  less often. A reply reaches the visitor on their widget's next two-second poll.

  Defaults to "Waiting on us", the work, rather than to the archive.
*/

export const dynamic = 'force-dynamic';

type Params = { filter?: string; q?: string; c?: string };

export default async function AdminChatPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  const filter = isChatFilter(searchParams.filter) ? searchParams.filter : 'waiting';
  const q = searchParams.q?.trim() ?? '';

  const [list, thread] = await Promise.all([
    listConversations(filter, q),
    searchParams.c ? staffThread(searchParams.c) : Promise.resolve(null),
  ]);

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Agent</strong> conversations are answered automatically from the store&rsquo;s
              delivery, payment, discount and stock settings. Nothing an agent says is a commitment
              beyond what those settings already say. <strong>Support</strong> conversations wait
              here for a person.
            </p>
            <p>
              <strong>A chat is not consent to marketing.</strong> A visitor who leaves an address is
              linked to a contact so you can answer them, and nothing more.
            </p>
            <p className="mb-0">
              Messages cannot be edited or deleted. What was said to a customer is part of the record.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Live Chat</h1>
      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <ChatInbox
        filters={CHAT_FILTERS}
        initialFilter={filter}
        initialQuery={q}
        initialList={list}
        initialThread={thread}
      />
    </>
  );
}
