'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export function AuthButton() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          Dashboard
        </Link>
        <UserButton 
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <SignInButton>
        <button className="text-gray-600 hover:text-gray-900 transition-colors">
          Sign In
        </button>
      </SignInButton>
      <SignUpButton>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors">
          Get Started
        </button>
      </SignUpButton>
    </div>
  );
}