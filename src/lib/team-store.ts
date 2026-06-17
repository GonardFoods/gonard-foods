import { createClient } from "@vercel/kv";

function getKV() {
  const url = process.env.gonard_KV_REST_API_URL;
  const token = process.env.gonard_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    return createClient({ url, token });
  } catch {
    return null;
  }
}

const KV_KEY = "team_v1";

export interface TeamMember {
  id: string;
  name: string;
  position: string;
  photoUrl: string | null;
  order: number;
  createdAt: string;
}

export async function getTeam(): Promise<TeamMember[]> {
  const kv = getKV();
  if (!kv) return [];
  try {
    const data = await kv.get<TeamMember[]>(KV_KEY);
    return (data ?? []).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function saveTeam(members: TeamMember[]): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  await kv.set(KV_KEY, members);
}
