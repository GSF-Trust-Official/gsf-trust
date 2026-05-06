import { SignJWT, importPKCS8 } from "jose";

interface ServiceAccount {
  client_email: string;
  private_key:  string;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const privateKey = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/drive.file",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Upload a file to the Foundation's Google Drive folder.
 * Returns a direct download URL.
 * Throws if the service account JSON or folder ID is missing/invalid.
 */
export async function uploadToDrive(
  content:  Uint8Array,
  filename: string,
  mimeType: string,
  env: {
    GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: string;
    GOOGLE_DRIVE_FOLDER_ID:            string;
  }
): Promise<string> {
  const sa = JSON.parse(env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  const token = await getAccessToken(sa);

  // Multipart upload: metadata + file content
  const metadata = JSON.stringify({
    name:     filename,
    parents:  [env.GOOGLE_DRIVE_FOLDER_ID],
    mimeType,
  });

  const body = new FormData();
  body.append("metadata", new Blob([metadata], { type: "application/json" }));
  body.append("file",     new Blob([content.buffer as ArrayBuffer], { type: mimeType }));

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    }
  );

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Drive upload error ${uploadRes.status}: ${text}`);
  }

  const { id: fileId } = (await uploadRes.json()) as { id: string };

  // Files are private — access is controlled by folder sharing on the Foundation's
  // Google Drive account. No public permission is granted.
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function isDriveConfigured(env: {
  GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?: string;
  GOOGLE_DRIVE_FOLDER_ID?:            string;
}): boolean {
  return (
    Boolean(env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) &&
    Boolean(env.GOOGLE_DRIVE_FOLDER_ID)
  );
}

interface DriveFile { id: string; name: string; createdTime: string }

/**
 * List files in the Drive folder whose names start with a given prefix.
 */
export async function listDriveFiles(
  prefix: string,
  env: { GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: string; GOOGLE_DRIVE_FOLDER_ID: string }
): Promise<DriveFile[]> {
  const sa    = JSON.parse(env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  const token = await getAccessToken(sa);

  const q = encodeURIComponent(
    `'${env.GOOGLE_DRIVE_FOLDER_ID}' in parents and name contains '${prefix}' and trashed = false`
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime)&pageSize=200`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { files: DriveFile[] };
  return data.files ?? [];
}

/**
 * Permanently delete a file from Drive (used to prune old backups).
 */
export async function deleteDriveFile(
  fileId: string,
  env: { GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: string; GOOGLE_DRIVE_FOLDER_ID: string }
): Promise<void> {
  const sa    = JSON.parse(env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
  const token = await getAccessToken(sa);
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}
