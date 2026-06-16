import { kv } from "@vercel/kv";

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
  const data = await kv.get<TeamMember[]>(KV_KEY);
  return (data ?? []).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export async function saveTeam(members: TeamMember[]): Promise<void> {
  await kv.set(KV_KEY, members);
}
