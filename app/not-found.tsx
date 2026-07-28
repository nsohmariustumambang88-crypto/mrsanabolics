import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-extrabold text-gradient-accent">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold">Page Not Found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild className="mt-6 gap-2 bg-accent text-black hover:bg-accent/90">
        <Link href="/">
          <Home className="h-4 w-4" />
          Back to Home
        </Link>
      </Button>
    </div>
  );
}
