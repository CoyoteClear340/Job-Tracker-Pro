import { google, type gmail_v1 } from "googleapis";

let cachedClient: gmail_v1.Gmail | null = null;

export function isGmailConfigured(): boolean {
  return !!(
    process.env["GOOGLE_CLIENT_ID"] &&
    process.env["GOOGLE_CLIENT_SECRET"] &&
    process.env["GOOGLE_REFRESH_TOKEN"]
  );
}

export async function getUncachableGmailClient(): Promise<gmail_v1.Gmail> {
  if (cachedClient) return cachedClient;

  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  const refreshToken = process.env["GOOGLE_REFRESH_TOKEN"];

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Gmail is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.",
    );
  }

  const redirectUri = process.env["GOOGLE_REDIRECT_URI"] ?? "https://developers.google.com/oauthplayground";

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  cachedClient = google.gmail({ version: "v1", auth: oauth2Client });
  return cachedClient;
}
