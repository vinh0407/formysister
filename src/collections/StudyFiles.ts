import type { CollectionConfig } from 'payload'

import {
  ownedCreateAccess,
  ownedReadAccess,
  ownedUpdateDeleteAccess,
} from './access'
import { collectionSlug } from './slugs'

export const StudyFiles: CollectionConfig = {
  slug: 'study-files',
  access: {
    create: ownedCreateAccess,
    delete: ownedUpdateDeleteAccess,
    read: ownedReadAccess,
    update: ownedUpdateDeleteAccess,
  },
  admin: {
    hidden: true,
  },
  fields: [
    {
      name: 'sessionHash',
      type: 'text',
      index: true,
      admin: { position: 'sidebar' },
      access: { update: () => false },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: collectionSlug('users'),
      index: true,
      admin: { position: 'sidebar' },
      access: { update: () => false },
    },
  ],
  upload: {
    filesRequiredOnCreate: true,
    mimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
    ],
  },
}
