/*
  Types and limits shared by the chat widget, the chat API and the admin inbox.

  No `server-only` guard: the widget imports the limits so the text box and the server refuse the
  same lengths. Nothing here touches the database.
*/

export type ChatRoleName = 'visitor' | 'bot' | 'staff';
export type ChatModeName = 'agent' | 'support';
export type ChatStatusName = 'agent' | 'open' | 'answered' | 'closed';

/** A message as it crosses the wire. Staff are never named to the visitor. */
export type ChatMessageDto = {
  id: string;
  role: ChatRoleName;
  mode: ChatModeName;
  body: string;
  /** ISO 8601 */
  createdAt: string;
};

/** Longest message a visitor or a member of staff may send. */
export const MAX_MESSAGE_LENGTH = 2000;

/** How often the open widget asks for new messages. */
export const VISITOR_POLL_MS = 2000;

/** How often the admin inbox refreshes the thread in front of it, and the list beside it. */
export const STAFF_THREAD_POLL_MS = 3000;
export const STAFF_LIST_POLL_MS = 8000;

/** The cookie that ties a browser to its conversation. Scoped to /api/chat, httpOnly. */
export const CHAT_COOKIE = 'mra_chat';
export const CHAT_COOKIE_PATH = '/api/chat';

export function isChatMode(value: unknown): value is ChatModeName {
  return value === 'agent' || value === 'support';
}
