import type { AddMemberInput } from '@/lib/api'

/** Roles a member can be given in the workspace (CW-9: never Owner), with what they allow (§3). */
export const ASSIGNABLE_ROLES: { value: AddMemberInput['role']; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Can edit the company and manage members.' },
  { value: 'manager', label: 'Manager', description: 'Can view the company and its members.' },
  { value: 'cashier', label: 'Cashier', description: 'Can view the company and its members.' },
]
