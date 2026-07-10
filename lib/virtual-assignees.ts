export interface AssignableMember {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  role: string;
}

export const CODEX_ASSIGNEE_ID = 'virtual-assignee-codex';
export const CLAUDE_ASSIGNEE_ID = 'virtual-assignee-claude';

export const VIRTUAL_ASSIGNEES: AssignableMember[] = [
  {
    id: CODEX_ASSIGNEE_ID,
    userId: CODEX_ASSIGNEE_ID,
    name: 'Codex',
    avatar: 'https://svgl.app/library/openai.svg',
    role: 'agent',
  },
  {
    id: CLAUDE_ASSIGNEE_ID,
    userId: CLAUDE_ASSIGNEE_ID,
    name: 'Claude',
    avatar: 'https://svgl.app/library/claude-ai-icon.svg',
    role: 'agent',
  },
];

export function withVirtualAssignees<T extends AssignableMember>(members: T[] = []): Array<T | AssignableMember> {
  const existingIds = new Set(members.map((member) => member.userId));
  return [
    ...members,
    ...VIRTUAL_ASSIGNEES.filter((member) => !existingIds.has(member.userId)),
  ];
}
