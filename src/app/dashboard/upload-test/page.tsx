import Link from 'next/link';
import { ImageUploadTest } from '@/components/upload/ImageUploadTest';

export default function UploadTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/dashboard"
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <h1 className="text-2xl font-bold text-orange-900 mb-3">
              🧪 Phase 4: AWS S3 Upload System Test
            </h1>
            <div className="space-y-2 text-orange-800">
              <p>
                <strong>Purpose:</strong> Test the complete image upload pipeline with AWS S3 integration.
              </p>
              <p>
                <strong>What this tests:</strong> File validation, image optimization, AWS S3 storage, and database recording.
              </p>
              <p>
                <strong>Requirements:</strong> AWS credentials must be configured in your .env.local file.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Status */}
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              📋 Configuration Checklist
            </h2>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-center gap-2">
                <span>✅</span> <span>AWS SDK packages installed</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⚠️</span> 
                <span>AWS S3 bucket created (see <code className="bg-blue-100 px-1 rounded">AWS_SETUP_GUIDE.md</code>)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⚠️</span> 
                <span>Environment variables configured (see <code className="bg-blue-100 px-1 rounded">CONFIG_TEMPLATE.md</code>)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⚠️</span> 
                <span>IAM user with S3 permissions created</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-100 rounded">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> If the upload fails, check your browser console and server logs for detailed error messages.
                Common issues include missing environment variables or incorrect AWS permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Test Component */}
        <ImageUploadTest />

        {/* Troubleshooting Guide */}
        <div className="mt-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-3">
              🛠️ Troubleshooting Common Issues
            </h2>
            <div className="space-y-3 text-sm text-yellow-800">
              <div>
                <strong>Error: "Storage service configuration error"</strong>
                <ul className="ml-4 mt-1 space-y-1 list-disc">
                  <li>Check that all AWS environment variables are set in .env.local</li>
                  <li>Ensure there are no extra spaces in your credentials</li>
                  <li>Restart your development server after adding env vars</li>
                </ul>
              </div>
              
              <div>
                <strong>Error: "AccessDenied" or "InvalidAccessKeyId"</strong>
                <ul className="ml-4 mt-1 space-y-1 list-disc">
                  <li>Verify your AWS Access Key ID and Secret Access Key</li>
                  <li>Ensure your IAM user has S3 permissions</li>
                  <li>Check that your AWS region is correct</li>
                </ul>
              </div>
              
              <div>
                <strong>Error: "NoSuchBucket"</strong>
                <ul className="ml-4 mt-1 space-y-1 list-disc">
                  <li>Verify your S3 bucket name is correct</li>
                  <li>Ensure the bucket exists in the specified region</li>
                  <li>Check for typos in AWS_S3_BUCKET_NAME</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-900 mb-3">
              🚀 Next Steps After Successful Test
            </h2>
            <div className="space-y-2 text-green-800">
              <p>
                Once your upload test is successful, you can proceed to:
              </p>
              <ul className="ml-4 mt-2 space-y-1 list-disc">
                <li>Phase 5: Google Gemini AI Integration for outfit swapping</li>
                <li>Phase 6: Backend API development for swap processing</li>
                <li>Phase 7: Frontend components for the main application</li>
              </ul>
              <p className="mt-3">
                <strong>Performance tip:</strong> Monitor your AWS free tier usage in the AWS Console 
                to avoid unexpected charges.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
