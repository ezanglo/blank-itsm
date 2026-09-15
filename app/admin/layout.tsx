import { redirect } from "next/navigation";
import { buildRequestContext, hasPermission } from "@/lib/auth/context";
import { handleAuthLayoutFailure } from "@/lib/auth/redirect";
import Link from "next/link";
import { Button } from "@/components/ui/button";

async function getAdminContext() {
  try {
    const ctx = await buildRequestContext();
    if (!hasPermission(ctx, "admin:access")) {
      redirect("/portal");
    }
    return ctx;
  } catch (error) {
    handleAuthLayoutFailure(error);
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getAdminContext();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-semibold">Admin</h1>
            <nav className="hidden md:flex gap-4">
              <Link href="/admin/users">
                <Button variant="ghost">Users</Button>
              </Link>
              <Link href="/admin/branding">
                <Button variant="ghost">Branding</Button>
              </Link>
              <Link href="/agent">
                <Button variant="ghost">Agent Workspace</Button>
              </Link>
              <Link href="/portal">
                <Button variant="ghost">Portal</Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
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
