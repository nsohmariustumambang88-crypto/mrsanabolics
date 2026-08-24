import { v2 as cloudinary } from 'cloudinary';

/*
  Cloudinary uploads — the implementation.

  This is the only module that touches the API secret. It carries no `server-only` guard so
  that build scripts (which run in plain Node, outside any React server context) can use it;
  app code must import lib/cloudinary-server.ts instead, which adds that guard.

  The secret is protected regardless: Next only inlines NEXT_PUBLIC_* variables into client
  bundles, so CLOUDINARY_API_SECRET is simply absent there. The guard is defence in depth.

  Note the asymmetry with lib/cloudinary.ts: that one builds delivery URLs from the public
  cloud name and is safe anywhere. This one signs, uploads and destroys, and is not.
*/

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export const uploadsConfigured = Boolean(cloudName && apiKey && apiSecret);

if (uploadsConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

/** Everything this project uploads lives under one prefix, so it can be audited or purged. */
export const ASSET_FOLDER = 'mranabolics';
export const PRODUCT_FOLDER = `${ASSET_FOLDER}/products`;

function assertConfigured(): void {
  if (!uploadsConfigured) {
    throw new Error(
      'Cloudinary uploads are not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, ' +
        'CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.'
    );
  }
}

export type UploadResult = {
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  version: number;
};

/**
 * Upload a buffer.
 *
 * `overwrite` plus a deterministic public ID makes this idempotent: re-running the generator
 * replaces the asset in place instead of accumulating a new copy per run. `invalidate` clears
 * the CDN edge cache, without which a replaced image keeps serving the old bytes for hours.
 */
export async function uploadBuffer(
  buffer: Buffer,
  publicId: string,
  options: { folder?: string; format?: string } = {}
): Promise<UploadResult> {
  assertConfigured();

  const { folder = PRODUCT_FOLDER, format = 'png' } = options;

  return new Promise<UploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        folder,
        format,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('Cloudinary returned no result'));
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          format: result.format,
          version: result.version,
        });
      }
    );

    stream.end(buffer);
  });
}

/**
 * A short-lived signature for a direct browser upload.
 *
 * The browser posts the file straight to Cloudinary using this signature, so the file never
 * passes through the app server and the secret never leaves it. The signature covers exactly
 * the parameters Cloudinary will receive — changing one client-side invalidates it, which is
 * the property that stops a caller uploading wherever they like.
 */
export function signUpload(params: Record<string, string | number>): {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
} {
  assertConfigured();

  const timestamp = Math.round(Date.now() / 1000);
  const toSign = { ...params, timestamp };

  const signature = cloudinary.utils.api_sign_request(
    toSign,
    process.env.CLOUDINARY_API_SECRET as string
  );

  return {
    signature,
    timestamp,
    apiKey: apiKey as string,
    cloudName: cloudName as string,
  };
}

/** Remove an asset. Used when a round abandons a raster it produced. */
export async function destroyAsset(publicId: string): Promise<void> {
  assertConfigured();
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
}

export { cloudinary };
