import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="bg-white text-neutral-900">
      {/* Asymmetric Editorial Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-16 sm:pt-24 sm:pb-24">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-10 items-start">
          <div className="lg:col-span-7">
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-[0.14em] mb-4">
              SnapShare · Studio & Event Delivery
            </p>
            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tighter text-neutral-950 leading-[1.06]">
              Event photo delivery,
              <br />
              indexed by face.
            </h1>
            <p className="mt-5 text-base text-neutral-600 max-w-prose leading-relaxed">
              Upload full-resolution event photos once. Share one QR code at the venue.
              Guests take a quick selfie to collect every photo they appear in, or receive
              their personal photo pack via Email and WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/register" className="btn-accent py-2.5 px-5">
                Create an occasion
              </Link>
              <Link href="/login" className="btn-secondary py-2.5 px-5">
                Photographer login
              </Link>
            </div>
            <div className="mt-10 pt-6 border-t border-neutral-100 flex flex-wrap gap-8 text-xs">
              <div>
                <p className="font-mono text-neutral-900 font-semibold">128-d FaceNet</p>
                <p className="text-neutral-400 mt-0.5">Browser-side landmark extraction</p>
              </div>
              <div>
                <p className="font-mono text-neutral-900 font-semibold">Uncompressed</p>
                <p className="text-neutral-400 mt-0.5">Original files & ZIP archives</p>
              </div>
              <div>
                <p className="font-mono text-neutral-900 font-semibold">Multi-shooter</p>
                <p className="text-neutral-400 mt-0.5">Collaborate in one live gallery</p>
              </div>
            </div>
          </div>

          {/* Architectural specimen sheet (non-template visual) */}
          <div className="lg:col-span-5">
            <div className="border border-neutral-200 rounded bg-stone-50/70 p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded bg-neutral-900 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    MK
                  </span>
                  <div>
                    <p className="text-xs font-medium text-neutral-900">Meera & Kabir Reception</p>
                    <p className="text-[10px] font-mono text-neutral-400">CODE · MK2489</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-neutral-300 bg-white rounded text-neutral-700">
                  LIVE
                </span>
              </div>

              {/* Smart Albums Specimen */}
              <div>
                <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
                  Smart albums · auto-grouped
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Meera', count: '42', tag: 'Person' },
                    { name: 'Kabir', count: '38', tag: 'Person' },
                    { name: 'Group Shots', count: '64', tag: '3+ faces' },
                  ].map((item) => (
                    <div key={item.name} className="bg-white border border-neutral-200 rounded p-2.5">
                      <p className="text-xs font-medium text-neutral-900 truncate">{item.name}</p>
                      <p className="text-[10px] font-mono text-neutral-400 mt-0.5 tabular-nums">
                        {item.count} photos
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery & Telemetry Specimen */}
              <div className="bg-white border border-neutral-200 rounded divide-y divide-neutral-100 text-xs">
                <div className="p-3 flex items-center justify-between">
                  <span className="text-neutral-600">Face match query</span>
                  <span className="font-mono text-neutral-900">14 photos found</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-neutral-600">Delivery options</span>
                  <span className="font-mono text-neutral-500">ZIP · Email · WhatsApp</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-neutral-600">Venue projector feed</span>
                  <span className="font-mono text-accent">5s live polling</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-neutral-200" />

      {/* 4-Step Workflow */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-[0.14em] mb-8">
          Workflow
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              step: '01',
              title: 'Configure occasion',
              desc: 'Set event date, studio name, logo mark, and accent color. Invite second shooters to upload alongside you.',
            },
            {
              step: '02',
              title: 'Upload & index faces',
              desc: 'Drop batches up to 50 MB per image. Face descriptors are extracted in-browser and grouped into Smart Albums.',
            },
            {
              step: '03',
              title: 'Project live or print QR',
              desc: 'Run Live Slideshow Mode on a venue screen with newly uploaded photos streaming in alongside a scannable QR code.',
            },
            {
              step: '04',
              title: 'Guests match & export',
              desc: 'Guests scan, snap one quick selfie, download originals directly, or send their personal pack via Email or WhatsApp.',
            },
          ].map((item) => (
            <div key={item.step} className="border-t border-neutral-200 pt-4">
              <span className="text-xs font-mono text-accent">{item.step}</span>
              <h3 className="text-base font-display font-semibold text-neutral-900 mt-1.5 tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-neutral-200" />

      {/* Capabilities Ledger */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
          <div>
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-[0.14em] mb-6">
              For photography teams
            </p>
            <div className="divide-y divide-neutral-200 border-y border-neutral-200">
              {[
                ['Multi-photographer collaboration', 'Invite team members by email. Every contributor uploads to the shared catalog with per-shooter attribution.'],
                ['Custom studio branding', 'Attach your logo mark, studio bio, and accent color across guest galleries, delivery packs, and slideshows.'],
                ['Live venue slideshow', 'Dedicated dark-canvas projector route polls continuously for new uploads and displays a scannable QR overlay.'],
                ['Engagement analytics', 'Track gallery views, unique guests, photo lightbox opens, face matches, downloads, and contributor totals.'],
              ].map(([title, desc]) => (
                <div key={title} className="py-4">
                  <p className="text-sm font-medium text-neutral-900">{title}</p>
                  <p className="text-sm text-neutral-500 mt-1 max-w-prose">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-[0.14em] mb-6">
              For event guests
            </p>
            <div className="divide-y divide-neutral-200 border-y border-neutral-200">
              {[
                ['Selfie face matching', 'One selfie matches against 128-dimension embeddings to return every frame you appear in, sorted by confidence.'],
                ['Smart albums', 'Browse auto-clustered albums by person, portraits, or group shots—without needing to register an account.'],
                ['Email & WhatsApp delivery', 'Receive a permanent Personal Photo Pack URL via Email or WhatsApp, or download single files and ZIP archives immediately.'],
                ['Direct social sharing', 'Share individual frames or matched sets directly via native mobile share sheets, WhatsApp, X, or copyable links.'],
              ].map(([title, desc]) => (
                <div key={title} className="py-4">
                  <p className="text-sm font-medium text-neutral-900">{title}</p>
                  <p className="text-sm text-neutral-500 mt-1 max-w-prose">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-neutral-200" />

      {/* Quiet CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tighter text-neutral-900">
            Ready for your next event?
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Create an occasion in under a minute. Originals stored untouched.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/register" className="btn-accent py-2.5 px-5">
            Create free account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-stone-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-neutral-900 rounded flex items-center justify-center text-white text-[9px] font-mono font-bold">
              S
            </span>
            <span className="font-display font-medium text-neutral-700">SnapShare</span>
          </div>
          <span className="font-mono text-neutral-400">&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
