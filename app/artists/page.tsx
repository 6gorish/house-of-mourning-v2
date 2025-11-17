import { getPageContent } from '@/lib/content-loader';
import type { Metadata } from 'next';
import PageTransition from '@/components/PageTransition';
import ArtistProfile from '@/components/ArtistProfile';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPageContent('artists');
  return {
    title: content.metadata.title,
    description: content.metadata.description,
  };
}

export default async function ArtistsPage() {
  const content = await getPageContent('artists');

  return (
    <PageTransition>
      <main>
        <section className="py-24 md:py-32 bg-stone-50">
          <div className="max-w-6xl mx-auto px-6 md:px-12">
            <ArtistProfile content={content.content} />
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
