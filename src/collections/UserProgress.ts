import type { CollectionConfig } from 'payload'

import { adminOnly, ownedReadAccess } from './access'
import { collectionSlug } from './slugs'

const activityFields = [
  { name: 'date', type: 'text' as const, required: true, maxLength: 10 },
  { name: 'quizzes', type: 'number' as const, required: true, min: 0, defaultValue: 0 },
  { name: 'questions', type: 'number' as const, required: true, min: 0, defaultValue: 0 },
  { name: 'correct', type: 'number' as const, required: true, min: 0, defaultValue: 0 },
]

export const UserProgress: CollectionConfig = {
  slug: 'user-progress',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: ownedReadAccess,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'progressKey',
    group: 'Học tập',
    defaultColumns: ['progressKey', 'totalQuizzes', 'accuracy', 'currentStreak'],
  },
  fields: [
    {
      name: 'progressKey',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'totalQuizzes', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'totalQuestions', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'totalCorrectAnswers', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'accuracy', type: 'number', required: true, min: 0, max: 100, defaultValue: 0 },
    { name: 'currentStreak', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'longestStreak', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'lastStudyDate', type: 'text', maxLength: 10 },
    {
      name: 'weeklyActivity',
      type: 'array',
      fields: activityFields,
    },
    {
      name: 'monthlyActivity',
      type: 'array',
      fields: [
        { name: 'month', type: 'text', required: true, maxLength: 7 },
        { name: 'quizzes', type: 'number', required: true, min: 0, defaultValue: 0 },
        { name: 'questions', type: 'number', required: true, min: 0, defaultValue: 0 },
        { name: 'correct', type: 'number', required: true, min: 0, defaultValue: 0 },
        { name: 'accuracy', type: 'number', required: true, min: 0, max: 100, defaultValue: 0 },
      ],
    },
    {
      name: 'subjectPerformance',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true, maxLength: 200 },
        { name: 'attempts', type: 'number', required: true, min: 0, defaultValue: 0 },
        { name: 'accuracy', type: 'number', required: true, min: 0, max: 100, defaultValue: 0 },
      ],
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
