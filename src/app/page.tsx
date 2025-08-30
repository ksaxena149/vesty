import { SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <main className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your Photos with
              <span className="text-blue-600"> AI-Powered </span>
              Outfit Swapping
            </h1>
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Upload your photo, choose an outfit, and let our advanced AI create 
              stunning outfit transformations in seconds.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignUpButton>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors">
                  Start Creating Free
                </button>
              </SignUpButton>
              <Link
                href="/sign-in"
                className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our AI technology makes outfit swapping simple and realistic
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Upload Your Photo
              </h3>
              <p className="text-gray-600">
                Upload a clear photo of yourself or choose from our sample images
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">👗</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Choose an Outfit
              </h3>
              <p className="text-gray-600">
                Select from our collection of outfits or upload your own clothing images
              </p>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI Magic
              </h3>
              <p className="text-gray-600">
                Our AI creates a realistic outfit swap and delivers your new look
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="bg-white rounded-2xl p-12 shadow-sm max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Style?
            </h2>
            <p className="text-gray-600 mb-8">
              Join thousands of users already creating amazing outfit transformations
            </p>
            <SignUpButton>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors">
                Get Started Now - Free
              </button>
            </SignUpButton>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold mb-2">Vesty</h3>
            <p className="text-gray-400">
              AI-Powered Outfit Swapping Technology
            </p>
          </div>
          <p className="text-gray-400">
            © 2025 Vesty. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}