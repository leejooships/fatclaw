interface GoogleTokenPayload {
  sub: string;
  name: string;
  firstName: string;
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

    const fullName = data.name ?? data.email?.split("@")[0] ?? "Anonymous";
    const firstName = data.given_name ?? fullName.split(" ")[0] ?? "Anonymous";
    return {
      sub: data.sub,
      name: fullName,
      firstName,
      email: data.email ?? "",
      picture: data.picture ?? "",
    };
  } catch {
    return null;
  }
}
