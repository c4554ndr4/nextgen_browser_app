import { getChatGPTUser } from './chatgpt-auth';
import Scout from './scout';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await getChatGPTUser();
  return <Scout signedIn={Boolean(user)} />;
}
