import Link from 'next/link';

export default async function HomeRoute() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
        Go to{' '}
        <Link className={'hover:text-amber-300'} href={'/dashboard'}>
          dashboard
        </Link>
      </div>
    </main>
  );
}
