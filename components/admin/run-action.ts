'use client';

/*
  Call a server action without letting a thrown one freeze the screen.

  Every admin action returns {ok:true} | {ok:false,error} for expected failures — an expired
  session, a validation error, a row that has gone. But a server action can also REJECT, and that
  is not exotic: this database is Neon, which suspends when idle and refuses the first connection
  that wakes it, so an admin left open for ten minutes will hit it on the next click.

  An uncaught rejection in a handler shaped like

      setBusy(true);
      const result = await someAction(...);
      setBusy(false);            // never runs

  leaves the button stuck on "Saving…", shows no message, writes nothing, and looks exactly like
  a control that silently does not work. That is the single worst failure mode for an admin, and
  it was reachable from every screen here.

  Wrapping the call turns it into an ordinary {ok:false} the existing UI already knows how to
  render, so the person sees what happened and can press the button again.
*/

export type ActionOutcome = { ok: true } | { ok: false; error: string };

const UNREACHABLE =
  'That did not save — the server or the database did not answer. Nothing was changed, so try again.';

export async function runAction<T extends { ok: boolean }>(
  call: () => Promise<T>
): Promise<T | { ok: false; error: string }> {
  try {
    return await call();
  } catch (error) {
    /*
      Deliberately not the raw message. A server action rejection surfaces as a generic digest in
      production anyway, and a Prisma connection string in a toast would be a leak.
    */
    if (process.env.NODE_ENV === 'development') {
      console.error('admin action failed', error);
    }
    return { ok: false, error: UNREACHABLE };
  }
}
