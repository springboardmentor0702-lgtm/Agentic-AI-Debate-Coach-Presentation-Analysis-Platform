import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: 'LOGOS.AI | Agentic AI Debate Coach & Presentation Analytics Platform',
  description: 'Detect fallacies in real-time. Simulate world-class opponents. Master the podium.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
