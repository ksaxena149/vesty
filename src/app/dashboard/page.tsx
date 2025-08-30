import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to your Dashboard, {user?.firstName || 'User'}!
          </h1>
          <p className="text-gray-600">
            Manage your AI outfit swaps and view your transformation history
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Test Upload Card (Phase 4) */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 ring-2 ring-orange-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🧪</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Test Upload System
            </h3>
            <p className="text-gray-600 mb-4">
              Test AWS S3 integration and image processing
            </p>
            <Link href="/dashboard/upload-test">
              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-md transition-colors">
                Test Upload
              </button>
            </Link>
          </div>

          {/* Upload Image Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📸</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Your Photo
            </h3>
            <p className="text-gray-600 mb-4">
              Start by uploading a clear photo of yourself
            </p>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
              Upload Image
            </button>
          </div>

          {/* Browse Outfits Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">👗</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Browse Outfits
            </h3>
            <p className="text-gray-600 mb-4">
              Choose from our collection of stylish outfits
            </p>
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors">
              Browse Outfits
            </button>
          </div>

          {/* Swap History Card */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⏰</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Swap History
            </h3>
            <p className="text-gray-600 mb-4">
              View your previous outfit transformations
            </p>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors">
              View History
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">🎨</span>
            <p className="text-gray-600 mb-4">
              No outfit swaps yet! Start by uploading your first photo.
            </p>
            <Link
              href="/profile"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Manage Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}