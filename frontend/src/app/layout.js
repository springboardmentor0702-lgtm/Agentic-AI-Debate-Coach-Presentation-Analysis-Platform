import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'LOGOS.AI | Agentic AI Debate Coach & Presentation Analytics Platform',
  description: 'Detect fallacies in real-time. Simulate world-class opponents. Master the podium.',
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
