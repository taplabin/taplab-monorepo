export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-5xl font-bold text-gray-900">TapLab</h1>
        <p className="text-xl text-gray-600 max-w-md">
          Beautiful business pages, powered by Web Components
        </p>
        <div className="pt-4">
          <a
            href="/pizza_palace"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            View Example Page
          </a>
        </div>
      </div>
    </div>
  );
}
