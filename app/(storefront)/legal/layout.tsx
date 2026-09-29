export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {children}
      </div>
    </main>
  );
}
