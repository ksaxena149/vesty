import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join Vesty
          </h1>
          <p className="text-gray-600">
            Create your account and transform your photos with AI
          </p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 
                "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
              card: "shadow-lg",
            },
          }}
        />
      </div>
    </div>
  );
}
