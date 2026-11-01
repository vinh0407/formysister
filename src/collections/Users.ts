import type { CollectionConfig } from 'payload'

import { adminFieldOnly, adminOnly, isAdminOrSelf } from './access'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
  },
  admin: {
    useAsTitle: 'email',
    group: 'Ứng dụng',
    defaultColumns: ['name', 'email', 'role', 'createdAt'],
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'student',
      options: [
        { label: 'Học sinh', value: 'student' },
        { label: 'Quản trị', value: 'admin' },
      ],
      access: {
        update: adminFieldOnly,
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
  ],
  timestamps: true,
}
