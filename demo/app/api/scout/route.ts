import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { handleScout } from '../../../lib/scout.mjs';
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  return handleScout(request, env, user?.userId);
}
