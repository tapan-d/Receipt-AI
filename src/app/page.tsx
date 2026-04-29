import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Receipt AI</h1>
        <p className="mt-2 text-gray-600">
          Scan receipts, track spending, and ask AI questions about your purchases.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/upload"
          className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="text-3xl mb-3">📷</div>
          <h2 className="font-semibold text-gray-900">Upload Receipt</h2>
          <p className="mt-1 text-sm text-gray-500">
            Photograph or upload a receipt image for AI extraction.
          </p>
        </Link>

        <Link
          href="/receipts"
          className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="text-3xl mb-3">🧾</div>
          <h2 className="font-semibold text-gray-900">My Receipts</h2>
          <p className="mt-1 text-sm text-gray-500">
            Browse all scanned receipts and their line items.
          </p>
        </Link>

        <Link
          href="/query"
          className="block p-6 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div className="text-3xl mb-3">🤖</div>
          <h2 className="font-semibold text-gray-900">Ask AI</h2>
          <p className="mt-1 text-sm text-gray-500">
            Query your purchase history in natural language.
          </p>
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h3 className="font-semibold text-blue-800 mb-2">Example questions you can ask</h3>
        <ul className="space-y-1 text-sm text-blue-700 list-disc list-inside">
          <li>How much did I spend on dairy products this month?</li>
          <li>Show me the price history of olive oil from Costco.</li>
          <li>What are my top 5 most purchased items?</li>
          <li>How much did I spend at Whole Foods last quarter?</li>
        </ul>
      </div>
    </div>
  );
}
