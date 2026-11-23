import Link from 'next/link';
import { Camera, QrCode, Scan, Download, Shield, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Share Event Photos
              <span className="block text-primary-200 mt-2">Instantly with AI</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-primary-100 max-w-2xl mx-auto">
              Photographers upload. Guests scan a QR code, take a selfie, and instantly find all their photos using AI face recognition. Download in full quality.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="bg-white text-primary-700 hover:bg-primary-50 font-semibold py-3 px-8 rounded-lg text-lg transition-colors">
                Get Started Free
              </Link>
              <Link href="/login" className="border-2 border-white/30 hover:border-white/60 text-white font-semibold py-3 px-8 rounded-lg text-lg transition-colors">
                Photographer Login
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Camera className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Photographers Upload</h3>
              <p className="text-gray-600">
                Create an occasion, upload high-quality photos. Our AI automatically detects and indexes faces.
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <QrCode className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Share QR Code</h3>
              <p className="text-gray-600">
                Generate a unique QR code for each event. Print it, display it, or share the link.
              </p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Scan className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Scan & Find Photos</h3>
              <p className="text-gray-600">
                Guests scan the QR code, take a quick selfie, and AI instantly finds all their photos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-16">
            Why SnapShare?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card">
              <Download className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Quality Downloads</h3>
              <p className="text-gray-600 text-sm">
                Original photos are never compressed. Guests download exactly what the photographer captured.
              </p>
            </div>
            <div className="card">
              <Scan className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Face Recognition</h3>
              <p className="text-gray-600 text-sm">
                Take a selfie and our AI finds every photo you appear in. No manual searching needed.
              </p>
            </div>
            <div className="card">
              <QrCode className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">QR Code Access</h3>
              <p className="text-gray-600 text-sm">
                Each occasion gets a unique QR code. Guests just scan and go — no app download required.
              </p>
            </div>
            <div className="card">
              <Users className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Photographer</h3>
              <p className="text-gray-600 text-sm">
                Multiple photographers can upload to the same occasion. Perfect for large events.
              </p>
            </div>
            <div className="card">
              <Shield className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy First</h3>
              <p className="text-gray-600 text-sm">
                Selfies are processed instantly and never stored. Only the photographer controls the photos.
              </p>
            </div>
            <div className="card">
              <Camera className="h-8 w-8 text-primary-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mobile Optimized</h3>
              <p className="text-gray-600 text-sm">
                Fully responsive design optimized for phones. Perfect for on-the-go access after events.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to transform your photo sharing?
          </h2>
          <p className="text-primary-100 text-lg mb-8">
            Start sharing event photos with AI-powered face recognition today.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-primary-700 hover:bg-primary-50 font-semibold py-3 px-8 rounded-lg text-lg transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Camera className="h-6 w-6 text-primary-400" />
              <span className="text-lg font-bold text-white">SnapShare</span>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} SnapShare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
