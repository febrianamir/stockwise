import type { ReactNode } from 'react'
import { Wordmark } from '@/components/wordmark'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthLayoutProps {
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Centred card used by the guest and verification screens (PRD §8). */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Wordmark />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            <h1>{title}</h1>
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>}
      </Card>
    </main>
  )
}
