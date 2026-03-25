import { redirect } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default async function Home() {
  try {
    const res = await fetch(`${API_URL}/api/auth/config`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.setupRequired) {
        redirect('/setup');
      }
    }
  } catch {
    // Server unreachable — fall through to login
  }
  redirect('/login');
}
