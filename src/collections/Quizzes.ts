import type { CollectionConfig } from 'payload'

import {
  ownedCreateAccess,
  ownedUpdateDeleteAccess,
  publicOrOwnedRead,
} from './access'
import { collectionSlug } from './slugs'

const difficultyOptions = [
  { label: 'Dễ', value: 'easy' },
  { label: 'Trung bình', value: 'medium' },
  { label: 'Khó', value: 'hard' },
]

export const Quizzes: CollectionConfig = {
  slug: 'quizzes',
  access: {
    create: ownedCreateAccess,
    delete: ownedUpdateDeleteAccess,
    read: publicOrOwnedRead,
    update: ownedUpdateDeleteAccess,
  },
  admin: {
    useAsTitle: 'title',
    group: 'Học tập',
    defaultColumns: ['title', 'difficulty', 'questionCount', 'createdAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 1000,
    },
    {
      name: 'sourceMaterial',
      type: 'relationship',
      relationTo: collectionSlug('study-materials'),
    },
    {
      name: 'questions',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 25,
      fields: [
        {
          name: 'questionId',
          type: 'text',
          required: true,
          maxLength: 40,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'multiple-choice',
          options: [
            { label: 'Trắc nghiệm', value: 'multiple-choice' },
            { label: 'Tự luận', value: 'essay' },
          ],
        },
        {
          name: 'prompt',
          type: 'textarea',
          required: true,
          maxLength: 2000,
        },
        {
          name: 'options',
          type: 'array',
          maxRows: 4,
          fields: [
            {
              name: 'text',
              type: 'text',
              required: true,
              maxLength: 500,
            },
          ],
        },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
          maxLength: 3000,
        },
        {
          name: 'explanation',
          type: 'textarea',
          maxLength: 3000,
        },
        {
          name: 'difficulty',
          type: 'select',
          defaultValue: 'medium',
          options: difficultyOptions,
        },
      ],
    },
    {
      name: 'difficulty',
      type: 'select',
      defaultValue: 'medium',
      options: difficultyOptions,
    },
    {
      name: 'questionCount',
      type: 'number',
      min: 0,
    },
    {
      name: 'essayCount',
      type: 'number',
      min: 0,
    },
    {
      name: 'model',
      type: 'text',
      maxLength: 160,
      admin: { position: 'sidebar' },
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'private',
      options: [
        { label: 'Riêng tư', value: 'private' },
        { label: 'Công khai', value: 'public' },
      ],
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
