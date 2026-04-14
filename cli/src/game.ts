export interface Player {
  id: string;
  username: string;
  iconIndex: number;
  x: number;
  y: number;
  lastActive: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  iconIndex: number;
  text: string;
  timestamp: number;
}

export async function joinGame(
  serverUrl: string,
  username: string,
  iconIndex: number,
): Promise<Player> {
  const res = await fetch(`${serverUrl}/api/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, iconIndex }),
  });
  if (!res.ok) throw new Error(`Join failed: ${res.status}`);
  return res.json();
}

export async function movePlayer(
  serverUrl: string,
  playerId: string,
  x: number,
  y: number,
): Promise<Player> {
  const res = await fetch(`${serverUrl}/api/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: playerId, x, y }),
  });
  if (!res.ok) throw new Error(`Move failed: ${res.status}`);
  return res.json();
}

export async function sendChat(
  serverUrl: string,
  playerId: string,
  text: string,
): Promise<ChatMessage> {
  const res = await fetch(`${serverUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, text }),
  });
  if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
  return res.json();
}

export async function getPlayers(
  serverUrl: string,
): Promise<{ players: Player[]; messages: ChatMessage[] }> {
  const res = await fetch(`${serverUrl}/api/players`);
  if (!res.ok) throw new Error(`Fetch players failed: ${res.status}`);
  return res.json();
}
