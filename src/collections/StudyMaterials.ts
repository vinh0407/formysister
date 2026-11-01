import type { CollectionConfig } from 'payload'

import {
  ownedCreateAccess,
  ownedReadAccess,
  ownedUpdateDeleteAccess,
} from './access'
import { collectionSlug } from './slugs'

export const StudyMaterials: CollectionConfig = {
  slug: 'study-materials',
  access: {
    create: ownedCreateAccess,
    delete: ownedUpdateDeleteAccess,
    read: ownedReadAccess,
    update: ownedUpdateDeleteAccess,
  },
  admin: {
    useAsTitle: 'title',
    group: 'Học tập',
    defaultColumns: ['title', 'sourceType', 'processingStatus', 'createdAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 1000,
    },
    {
      name: 'originalFilename',
      type: 'text',
      maxLength: 255,
    },
    {
      name: 'file',
      type: 'relationship',
      relationTo: collectionSlug('study-files'),
    },
    {
      name: 'extractedText',
      type: 'textarea',
      maxLength: 120_000,
    },
    {
      name: 'mimeType',
      type: 'text',
      maxLength: 120,
    },
    {
      name: 'fileSize',
      type: 'number',
      min: 0,
    },
    {
      name: 'sourceType',
      type: 'select',
      required: true,
      defaultValue: 'text',
      options: [
        { label: 'Văn bản', value: 'text' },
        { label: 'Ảnh', value: 'image' },
        { label: 'PDF', value: 'pdf' },
        { label: 'DOCX', value: 'docx' },
        { label: 'TXT/Markdown', value: 'txt' },
      ],
    },
    {
      name: 'processingStatus',
      type: 'select',
      required: true,
      defaultValue: 'ready',
      options: [
        { label: 'Đang xử lý', value: 'pending' },
        { label: 'Sẵn sàng', value: 'ready' },
        { label: 'Lỗi', value: 'failed' },
      ],
    },
    {
      name: 'pageCount',
      type: 'number',
      min: 0,
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      maxLength: 1000,
      admin: { position: 'sidebar' },
    },
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
  timestamps: true,
}
