import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import OutfitSwapTest from '@/components/swap/OutfitSwapTest';

export default async function OutfitSwapPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Outfit Swap
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the future of fashion with our advanced AI outfit swap technology.
            Upload your photo and an outfit image to see yourself in a whole new look!
          </p>
        </div>
        
        <OutfitSwapTest />
      </div>
    </div>
  );
}
