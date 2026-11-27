import type { BranchAccessSnapshot, BranchScope, BranchStatus, BranchType } from '@/lib/api'

/** Labels shared by the branch screens, the member list and the platform views. */

export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  store: 'Store',
  warehouse: 'Warehouse',
}

export const BRANCH_STATUS_LABELS: Record<BranchStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

export const BRANCH_SCOPE_LABELS: Record<BranchScope, string> = {
  all: 'All Branches',
  selected: 'Selected Branches',
}

/** "All branches", "No branches", "GOW, MKS" for activity entries. */
export function describeBranchAccess(snapshot: BranchAccessSnapshot): string {
  if (snapshot.scope === 'all') {
    return 'All branches'
  }

  return snapshot.branches.length === 0 ? 'No branches' : snapshot.branches.join(', ')
}
