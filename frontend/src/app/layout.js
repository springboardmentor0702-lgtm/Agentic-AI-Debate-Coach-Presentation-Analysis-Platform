import "./globals.css";

export const metadata = {
  title: "AI Debate Coach",
  description:
    "AI-powered debate simulation, coaching and performance analysis platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
