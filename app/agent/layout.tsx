import { redirect } from "next/navigation";
import { buildRequestContext, hasPermission } from "@/lib/auth/context";
import { BrandingRepository } from "@/lib/repositories/brandingRepository";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getAgentContext() {
  try {
    const ctx = await buildRequestContext();
    if (!hasPermission(ctx, "agent:access")) {
      redirect("/portal");
    }
    return ctx;
  } catch {
    redirect("/sign-in");
  }
}

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAgentContext();
  
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
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Organization logo"
                className="h-8 w-auto"
              />
            ) : (
              <h1 className="text-xl font-semibold">Agent Workspace</h1>
            )}
            <nav className="hidden md:flex gap-4">
              <Link href="/agent">
                <Button variant="ghost">Queue</Button>
              </Link>
              <Link href="/portal">
                <Button variant="ghost">Portal</Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
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
