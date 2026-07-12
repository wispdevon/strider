import { getAllBoards, getBoardBySlug, getBoardMembers, getDeletedProjectsByBoardId, getProjectsByBoardId } from '@/lib/db';
import { getUserById } from '@/lib/users';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function exportFileName(name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || 'board'}-${date}.json`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = getBoardBySlug(id) || getAllBoards().find((entry) => entry.id === id);

  if (!board) {
    return new Response(JSON.stringify({ error: 'Board not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const session = await getSession();
  if (!session?.userId || board.ownerId !== session.userId) {
    return new Response(JSON.stringify({ error: 'Only the board owner can export this board' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const members = getBoardMembers(board.id).map((member) => {
    const user = getUserById(member.userId);
    return {
      ...member,
      name: user?.name || 'Unknown',
      friendCode: user?.friendCode || '',
    };
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Strider',
    version: 2,
    board: {
      id: board.id,
      name: board.name,
      emoji: board.emoji,
      websiteUrl: board.websiteUrl,
      slug: board.slug,
      joinCode: board.joinCode,
      ownerId: board.ownerId,
      isPublic: board.isPublic,
      passkeyRequired: board.passkeyRequired,
      createdAt: board.createdAt,
    },
    members,
    projects: getProjectsByBoardId(board.id),
    deletedProjects: getDeletedProjectsByBoardId(board.id),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName(board.name)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
