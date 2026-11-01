import type { CollectionConfig } from 'payload'

import { collectionSlug } from './slugs'

export const StudySessions: CollectionConfig = {
  slug: 'study-sessions',
  access: {
    create: () => false,
    delete: () => false,
    read: () => false,
    update: () => false,
  },
  admin: {
    hidden: true,
  },
  fields: [
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'lastSeenAt',
      type: 'date',
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: collectionSlug('users'),
      index: true,
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
