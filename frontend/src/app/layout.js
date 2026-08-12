import { Inter, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import ThemeInjector from '@/components/theme/ThemeInjector';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata = {
  title: { default: 'Hotel Booking', template: '%s | Hotel Booking' },
  description: 'Book hotel rooms easily',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <AuthProvider>
          <TenantProvider>
            <ThemeInjector />
            <Navbar />
            <div className="flex-1">{children}</div>
            <Footer />
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
