import { getPageContent } from '@/lib/content-loader';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ShaderBackground } from '@/components/ShaderBackground';
import PageTransition from '@/components/PageTransition';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPageContent('home');
  return {
    title: content.metadata.title,
    description: content.metadata.description,
  };
}

export default async function HomePage() {
  const content = await getPageContent('home');

  return (
    <PageTransition>
      <main>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] overflow-hidden">
        {/* Shader Background */}
        <ShaderBackground />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30 z-0" />

        {/* Fallback gradient if shader fails */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900 to-stone-800 -z-20" />

        <div className="relative z-10 flex items-center min-h-[80vh]">
          <div className="w-full max-w-6xl mx-auto px-6 md:px-12 py-32 md:py-40">
            <div className="space-y-8 md:space-y-10 animate-fade-in">
              <h1 className="text-6xl md:text-7xl font-serif font-light tracking-tight leading-tight text-white drop-shadow-2xl">
                The House of Mourning
              </h1>

              <p className="text-xl md:text-2xl font-light leading-relaxed text-white/90 max-w-3xl">
                Grief witnessed collectively through art, sound, and language.
              </p>

              <p className="text-sm md:text-base text-white/70 tracking-wide uppercase">
                December 19-20, 2025 | Truss House, Denver
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4 pt-4">
                <Link href="/participate" className="btn-primary">
                  Share Your Grief
                </Link>
                <Link href="/about" className="btn-secondary bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 hover:border-white/50">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:block">
          <div className="flex flex-col items-center gap-2 text-white/60 animate-bounce">
            <span className="text-xs uppercase tracking-wider">Explore</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </section>

      {/* Introduction Section */}
      <section className="py-24 md:py-32 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-8">
          <p className="text-base md:text-lg font-light leading-relaxed text-stone-700">
            Grief can feel like the loneliest experience. We carry our losses as if they're singular, incomprehensible to anyone else. Yet when we create space to witness mourning together—not to fix it, not to rush past it, but simply to be present with it—something shifts.
          </p>

          <p className="text-base md:text-lg font-light leading-relaxed text-stone-700">
            <em>The House of Mourning</em> transforms Truss House into a sanctuary for personal and collective reflection. Mixed-media works by artists explore a secular iconography of grief, drawing on the visual language of mourning—ritual, religious iconography, gothic aesthetics—while filtering it through contemporary perspectives.
          </p>

          <p className="text-base md:text-lg font-light leading-relaxed text-stone-700">
            A data-driven generative soundscape and video installation invites you to offer your own expressions of loss, making your personal mourning part of the collective experience.
          </p>
        </div>
      </section>

      {/* Exhibition Details */}
      <section className="py-24 md:py-32 bg-stone-100">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight leading-tight text-stone-900 mb-12 md:mb-16 text-center">
            Visit the Exhibition
          </h2>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="text-center space-y-4">
              <h3 className="text-2xl md:text-3xl font-serif font-light tracking-tight text-stone-900">When</h3>
              <p className="text-base md:text-lg font-light leading-relaxed text-stone-600">
                December 19-20, 2025
              </p>
            </div>

            <div className="text-center space-y-4">
              <h3 className="text-2xl md:text-3xl font-serif font-light tracking-tight text-stone-900">Where</h3>
              <p className="text-base md:text-lg font-light leading-relaxed text-stone-600">
                Truss House<br />
                RiNo Art Park, Denver
              </p>
            </div>

            <div className="text-center space-y-4">
              <h3 className="text-2xl md:text-3xl font-serif font-light tracking-tight text-stone-900">Admission</h3>
              <p className="text-base md:text-lg font-light leading-relaxed text-stone-600">
                Free and open<br />
                to the public
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/event" className="btn-secondary">
              Full Schedule & Details
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 md:py-32 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 md:px-12 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight leading-tight text-stone-900">
            Contribute Your Voice
          </h2>

          <p className="text-lg md:text-xl font-light leading-relaxed text-stone-600 max-w-3xl mx-auto">
            Share a moment of loss, a memory, or a feeling. Your words will become part of the installation's living soundscape and visualization.
          </p>

          <div className="pt-4">
            <Link href="/participate" className="btn-primary">
              Share Your Grief
            </Link>
          </div>
        </div>
      </section>
    </main>
    </PageTransition>
  );
}
