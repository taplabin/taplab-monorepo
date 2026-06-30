import TopBar from './TopBar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <TopBar />
      {children}
    </div>
  );
}
