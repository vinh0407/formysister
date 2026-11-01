import type { CollectionConfig } from 'payload'

export const RateLimitBuckets: CollectionConfig = {
  slug: 'rate-limit-buckets',
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
      name: 'key',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'window',
      type: 'select',
      required: true,
      options: [
        { label: 'Giờ', value: 'hour' },
        { label: 'Ngày', value: 'day' },
      ],
    },
    {
      name: 'nonce',
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
  ],
  indexes: [{ fields: ['key', 'createdAt'], unique: false }],
  timestamps: true,
}
