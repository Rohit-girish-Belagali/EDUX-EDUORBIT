import "./globals.css";

export const metadata = {
  title: "EDU AI - Interactive 3D Login",
  description: "EDU AI 3D Interactive Login Page",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
