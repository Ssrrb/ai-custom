import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import CrearPage from './crear-page';

export default async function Page() {
  const session = await auth();

  // Check if user is not authenticated or is a guest user
  if (!session || session.user.type === 'guest') {
    redirect('/api/auth/signin');
  }

  return <CrearPage />;
}
