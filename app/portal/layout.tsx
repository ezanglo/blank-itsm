import { redirect } from "next/navigation";
import { buildRequestContext, hasPermission } from "@/lib/auth/context";
import { handleAuthLayoutFailure } from "@/lib/auth/redirect";
import { BrandingRepository } from "@/lib/repositories/brandingRepository";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getPortalContext() {
  try {
    const ctx = await buildRequestContext();
    if (!hasPermission(ctx, "portal:access")) {
      redirect("/sign-in");
    }
    return ctx;
  } catch (error) {
    handleAuthLayoutFailure(error);
  }
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalContext();
  
  // Get branding for this organization
  const branding = await BrandingRepository.getForOrg(ctx.orgId);
  
  // Build CSS variables for branding
  const brandingStyle: Record<string, string> = {};
  if (branding?.tokens) {
    if (branding.tokens.primary) {
      brandingStyle["--primary"] = branding.tokens.primary;
    }
    if (branding.tokens.primaryForeground) {
      brandingStyle["--primary-foreground"] = branding.tokens.primaryForeground;
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={brandingStyle}>
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Organization logo"
                className="h-8 w-auto"
              />
            ) : (
              <h1 className="text-xl font-semibold">Service Portal</h1>
            )}
            <nav className="hidden md:flex gap-4">
              <Link href="/portal">
                <Button variant="ghost">Home</Button>
              </Link>
              <Link href="/portal/tickets">
                <Button variant="ghost">My Tickets</Button>
              </Link>
              <Link href="/portal/tickets/new">
                <Button variant="ghost">Submit Ticket</Button>
              </Link>
              <Link href="/portal/catalog">
                <Button variant="ghost">Catalog</Button>
              </Link>
              <Link href="/portal/knowledge">
                <Button variant="ghost">Knowledge</Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {hasPermission(ctx, "agent:access") && (
              <Link href="/agent">
                <Button variant="outline">Agent Workspace</Button>
              </Link>
            )}
            {hasPermission(ctx, "admin:access") && (
              <Link href="/admin">
                <Button variant="outline">Admin</Button>
              </Link>
            )}
            <form action="/api/auth/sign-out" method="POST">
              <Button variant="ghost">Sign Out</Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
