import HostedDocumentView from '@/components/HostedDocumentView';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HostedDocumentView documentId={id} />;
}
