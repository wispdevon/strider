import HallOfFame from '@/components/HallOfFame';

interface BoardHallOfFamePageProps {
  params: Promise<{ slug: string }>;
}

export default async function BoardHallOfFamePage({ params }: BoardHallOfFamePageProps) {
  const { slug } = await params;
  return <HallOfFame boardSlug={slug} />;
}
