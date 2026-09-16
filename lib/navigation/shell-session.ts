import { headers } from "next/headers";

import { auth } from "@/lib/auth/index";
import type { ShellUser } from "@/components/nav-user";

export async function getShellUser(): Promise<ShellUser> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return {
    name: session?.user?.name?.trim() || "Account",
    email: session?.user?.email ?? "",
  };
}
