"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new dedicated Login page
    router.push('/login');
  }, []);

  return null;
}
