import type { CollectionConfig } from 'payload'

export const AIUsage: CollectionConfig = {
  slug: 'ai-usage',
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
      name: 'day',
      type: 'text',
      required: true,
      index: true,
      maxLength: 10,
    },
    {
      name: 'model',
      type: 'text',
      required: true,
      maxLength: 160,
    },
    {
      name: 'neurons',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
    },
    {
      name: 'requests',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 1,
    },
    {
      name: 'requestId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
  ],
  indexes: [{ fields: ['day', 'model'], unique: false }],
  timestamps: true,
}
