export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full relative overflow-x-hidden bg-black text-foreground">
      {children}
    </div>
  );
}
