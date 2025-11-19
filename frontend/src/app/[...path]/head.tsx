import { buildCanonicalUrl } from '@/lib/site';

type Params = {
  path?: string[];
};

export default function Head({ params }: { params: Params }) {
  const slug = params?.path && params.path.length > 0 ? `/${params.path.join('/')}` : '/';
  return (
    <>
      <link rel="canonical" href={buildCanonicalUrl(slug)} />
    </>
  );
}


