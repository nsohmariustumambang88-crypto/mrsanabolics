/* The column and the breadcrumb bar are drawn by components/legal/legal-page.tsx. */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="min-h-screen bg-paper">{children}</main>;
}
