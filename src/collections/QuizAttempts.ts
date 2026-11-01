import type { CollectionConfig } from 'payload'

import { adminOnly, ownedCreateAccess, ownedReadAccess, ownedUpdateDeleteAccess } from './access'
import { collectionSlug } from './slugs'

export const QuizAttempts: CollectionConfig = {
  slug: 'quiz-attempts',
  access: {
    create: ownedCreateAccess,
    delete: ownedUpdateDeleteAccess,
    read: ownedReadAccess,
    update: adminOnly,
  },
  admin: {
    useAsTitle: 'quizTitle',
    group: 'Học tập',
    defaultColumns: ['quizTitle', 'totalScore', 'correctCount', 'completedAt'],
  },
  fields: [
    {
      name: 'quiz',
      type: 'relationship',
      relationTo: collectionSlug('quizzes'),
      required: true,
      index: true,
    },
    {
      name: 'quizTitle',
      type: 'text',
      required: true,
      maxLength: 200,
      index: true,
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      defaultValue: 'learn',
      options: [
        { label: 'Học & luyện', value: 'learn' },
        { label: 'Kiểm tra', value: 'exam' },
      ],
    },
    {
      name: 'answers',
      type: 'array',
      required: true,
      fields: [
        { name: 'questionId', type: 'text', required: true, maxLength: 40 },
        {
          name: 'questionType',
          type: 'select',
          required: true,
          options: [
            { label: 'Trắc nghiệm', value: 'multiple-choice' },
            { label: 'Tự luận', value: 'essay' },
          ],
        },
        { name: 'answer', type: 'textarea', maxLength: 5000 },
        { name: 'isCorrect', type: 'checkbox' },
        { name: 'points', type: 'number', min: 0, max: 100 },
      ],
    },
    {
      name: 'objectiveScore',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
      defaultValue: 0,
    },
    { name: 'essayScore', type: 'number', min: 0, max: 100, defaultValue: 0 },
    { name: 'totalScore', type: 'number', required: true, min: 0, max: 100, defaultValue: 0 },
    { name: 'correctCount', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'incorrectCount', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'unansweredCount', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'objectiveQuestionCount', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'essayQuestionCount', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'answeredObjectiveCount', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'answeredEssayCount', type: 'number', required: true, min: 0, defaultValue: 0 },
    {
      name: 'gradingStatus',
      type: 'select',
      required: true,
      defaultValue: 'not-graded',
      options: [
        { label: 'Chưa chấm', value: 'not-graded' },
        { label: 'AI chấm tham khảo', value: 'ai-assisted' },
        { label: 'Giáo viên xác nhận', value: 'teacher-verified' },
      ],
    },
    {
      name: 'answersHash',
      type: 'text',
      maxLength: 80,
      index: true,
      admin: { position: 'sidebar' },
    },
    { name: 'startedAt', type: 'date' },
    { name: 'completedAt', type: 'date' },
    { name: 'durationSeconds', type: 'number', min: 0, max: 86_400 },
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
  indexes: [{ fields: ['sessionHash', 'quiz', 'answersHash'], unique: false }],
  timestamps: true,
}
