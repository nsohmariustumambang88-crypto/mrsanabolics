import { NextResponse } from 'next/server';
import { uploadBuffer, signUpload, uploadsConfigured, PRODUCT_FOLDER } from '@/lib/cloudinary-server';
import { getCurrentAdmin } from '@/lib/auth';

/*
  Upload endpoint.

  AUTHENTICATED, DELIBERATELY. An open upload route is an open door: anyone who finds it can
  fill the Cloudinary account, run up the bill, and host arbitrary files on the project's
  domain. This app has no user auth yet, so the route is gated on a shared token in
  ADMIN_UPLOAD_TOKEN and refuses to run at all when that is unset — failing closed rather than
  silently accepting anonymous uploads. Replace the token check with a real session check when
  auth lands.

  Two modes:

  POST (multipart/form-data, field `file`)
    Server-side upload. The file passes through this route. Simple, and fine for occasional
    admin use; the payload is capped below because a route handler holds it in memory.

  POST (application/json, { "mode": "sign" })
    Returns a short-lived signature so the browser can upload STRAIGHT to Cloudinary. The file
    never touches this server and the secret never leaves it. This is the right mode for
    anything large or frequent.

  Node runtime, not edge: the Cloudinary SDK needs Node crypto and streams.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A route handler buffers the whole body in memory, so cap it. */
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']);

/*
  Two ways in, both authenticated.

  A signed-in admin uses the session cookie, so the admin UI can upload without embedding a
  token in client JavaScript — which would put it in the bundle and defeat the point. Scripts
  and CI have no cookie, so they present ADMIN_UPLOAD_TOKEN as a bearer instead.

  Neither path has a default: with no session AND no configured token, this returns false and
  the route refuses everything.
*/
async function authorised(request: Request): Promise<boolean> {
  if (await getCurrentAdmin()) return true;

  const expected = process.env.ADMIN_UPLOAD_TOKEN;
  if (!expected) return false;

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token.length === expected.length && token === expected;
}

export async function POST(request: Request) {
  if (!uploadsConfigured) {
    return NextResponse.json(
      { error: 'Cloudinary is not configured on the server.' },
      { status: 503 }
    );
  }

  if (!(await authorised(request))) {
    return NextResponse.json(
      {
        error:
          'Unauthorised. Sign in to the admin, or send ADMIN_UPLOAD_TOKEN as "Authorization: Bearer <token>".',
      },
      { status: 401 }
    );
  }

  const contentType = request.headers.get('content-type') ?? '';

  /* --- Mode 2: hand back a signature for a direct browser upload ----------------------- */
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: string;
      folder?: string;
      publicId?: string;
    };

    if (body.mode !== 'sign') {
      return NextResponse.json({ error: 'Unknown mode. Expected { mode: "sign" }.' }, { status: 400 });
    }

    const params: Record<string, string> = { folder: body.folder ?? PRODUCT_FOLDER };
    if (body.publicId) params.public_id = body.publicId;

    const signed = signUpload(params);

    return NextResponse.json({
      ...signed,
      ...params,
      /* Where the browser POSTs the file, with these fields alongside it. */
      endpoint: `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    });
  }

  /* --- Mode 1: upload a file that came through this route ------------------------------ */
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Send multipart/form-data with a "file" field, or JSON { mode: "sign" }.' },
      { status: 415 }
    );
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided in the "file" field.' }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type "${file.type}". Allowed: ${Array.from(ALLOWED).join(', ')}.` },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB; the limit is ${MAX_BYTES / 1024 / 1024}MB.` },
      { status: 413 }
    );
  }

  /* Keep the source container rather than re-encoding. See the note in uploadBuffer. */
  const FORMAT_FOR: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
  };

  const folder = (form.get('folder') as string) || PRODUCT_FOLDER;
  const publicId =
    (form.get('publicId') as string) ||
    file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();

  try {
    const result = await uploadBuffer(Buffer.from(await file.arrayBuffer()), publicId, {
      folder,
      format: FORMAT_FOR[file.type] ?? 'png',
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
