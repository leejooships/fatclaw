interface GoogleTokenPayload {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

export async function verifyGoogleToken(
  idToken: string,
): Promise<GoogleTokenPayload | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) return null;

    const data = await res.json();

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientId && data.aud !== clientId) return null;

    return {
      sub: data.sub,
      name: data.name ?? data.email?.split("@")[0] ?? "Anonymous",
      email: data.email ?? "",
      picture: data.picture ?? "",
    };
  } catch {
    return null;
  }
}
