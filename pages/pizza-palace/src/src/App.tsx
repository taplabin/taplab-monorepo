export default function PageApp() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-indigo-600 text-white p-6">
        <h1 className="text-3xl font-bold">Template Page</h1>
        <p className="text-sm mt-1">Edit src/App.tsx to customize this page</p>
      </header>
      <section className="p-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Welcome to TapLab!</h2>
          <p className="text-gray-600">
            This is a template for creating business pages. Start building your custom UI here.
          </p>
        </div>
      </section>
    </main>
  );
}
