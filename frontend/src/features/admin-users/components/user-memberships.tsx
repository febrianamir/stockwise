import { Link } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CompanyStatusBadge, MembershipStatusBadge, OwnerBadge } from '@/components/company-badges'
import { ROLE_LABELS } from '@/lib/company'
import type { AdminUserMembership } from '@/lib/api'
import { formatDate } from '@/lib/format'

/** A user's company memberships on platform user details (read-only). */
export function UserMemberships({ memberships }: { memberships: AdminUserMembership[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Company Memberships</h2>
        </CardTitle>
        <CardDescription>Read-only. Roles are managed inside each company.</CardDescription>
      </CardHeader>
      <CardContent>
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">This user doesn't belong to any company.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Membership</TableHead>
                <TableHead>Company Status</TableHead>
                <TableHead>Joined At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col">
                      <Link to={`/admin/companies/${membership.company.id}`} className="max-w-56 truncate font-medium underline-offset-4 hover:underline">
                        {membership.company.name}
                      </Link>
                      <span className="font-mono text-xs text-muted-foreground">{membership.company.code}</span>
                    </div>
                  </TableCell>
                  <TableCell>{membership.is_owner ? <OwnerBadge /> : ROLE_LABELS[membership.role]}</TableCell>
                  <TableCell>
                    <MembershipStatusBadge status={membership.status} />
                  </TableCell>
                  <TableCell>
                    <CompanyStatusBadge status={membership.company.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{formatDate(membership.joined_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
