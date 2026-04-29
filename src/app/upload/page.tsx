import UploadZone from '@/components/UploadZone';

export default function UploadPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Receipt</h1>
        <p className="mt-1 text-gray-500">
          Claude AI will extract items, prices, and categories automatically.
        </p>
      </div>
      <UploadZone />
    </div>
  );
}
