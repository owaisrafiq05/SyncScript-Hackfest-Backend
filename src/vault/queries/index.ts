export const vaultSelect = {
  id: true,
  name: true,
  description: true,
  privacy: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
    },
  },
  _count: {
    select: { members: true, files: true, sources: true },
  },
} as const;

export type VaultSelect = {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  _count: {
    members: number;
    files: number;
    sources: number;
  };
};
