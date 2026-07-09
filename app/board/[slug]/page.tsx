import BoardView from '@/components/BoardView';

export default async function BoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BoardView boardSlug={slug} />;
}