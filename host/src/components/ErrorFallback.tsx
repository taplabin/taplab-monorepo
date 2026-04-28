interface ErrorFallbackProps {
  message: string;
}

export default function ErrorFallback({ message }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-semibold text-red-600">Something went wrong</h1>
      <p className="text-gray-500">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
      >
        Try again
      </button>
    </div>
  );
}
