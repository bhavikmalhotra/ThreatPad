'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    fetch(`${API_URL}/api/auth/verify-email/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not reach the server. Please try again.');
      });
  }, [token]);

  return (
    <div className="space-y-6 text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying your email...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Email Verified</h2>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
          </div>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Verification Failed</h2>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
          </div>
          <Link href="/login">
            <Button variant="outline">Back to sign in</Button>
          </Link>
        </>
      )}
    </div>
  );
}
