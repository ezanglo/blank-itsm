import type { authClient } from "@/lib/auth/client";

type AuthClient = typeof authClient;

export function isExistingAccountAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: string }).code ?? "").toLowerCase();
  return (
    code.includes("already_exists") ||
    code.includes("user_already_exists") ||
    code.includes("email_already")
  );
}

/** Seeded accounts exist in DB before first sign-in; sign-up should fall back to sign-in. */
export async function signUpOrSignInSeededAccount(
  client: AuthClient,
  input: { email: string; password: string; name: string }
) {
  const signUp = await client.signUp.email({
    email: input.email,
    password: input.password,
    name: input.name,
  });

  if (!signUp.error && signUp.data?.token) {
    return { ok: true as const, mode: "sign-up" as const };
  }

  if (signUp.error && !isExistingAccountAuthError(signUp.error)) {
    return { ok: false as const, error: signUp.error };
  }

  const signIn = await client.signIn.email({
    email: input.email,
    password: input.password,
  });

  if (signIn.error) {
    return { ok: false as const, error: signIn.error };
  }

  return { ok: true as const, mode: "sign-in" as const };
}
