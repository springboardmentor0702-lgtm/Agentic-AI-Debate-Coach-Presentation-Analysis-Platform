import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'LOGOS.AI — Debate Coach & Presentation Intelligence',
  description: 'Practice arguments, audit logic, and become a stronger communicator with agentic coaching.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}