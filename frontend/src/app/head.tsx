import { SITE_URL } from '@/lib/site';

export default function Head() {
  return (
    <>
      <link rel="canonical" href={SITE_URL} />
    </>
  );
}


