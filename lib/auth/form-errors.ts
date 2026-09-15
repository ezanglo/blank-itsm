/** Map Better Auth client errors to user-visible messages. */
export function messageFromAuthError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Authentication failed. Please try again.";
  }

  const record = error as { message?: string; code?: string; status?: number };
  const message = record.message?.trim();
  const code = record.code?.toLowerCase() ?? "";

  if (code.includes("invalid") && code.includes("password")) {
    return "Invalid email or password.";
  }
  if (code.includes("user_already_exists") || code.includes("already_exists")) {
    return "An account with this email already exists. Sign in with password123 (seeded users) or use a different email.";
  }
  if (code.includes("invalid_email")) {
    return "Please enter a valid email address.";
  }
  if (message) {
    return message;
  }
  return "Authentication failed. Please try again.";
}

export const SIGN_IN_QUERY_MESSAGES: Record<string, string> = {
  session: "Your session expired or could not be verified. Please sign in again.",
  membership:
    "You are signed in but have no organization membership. Use a seeded account (admin/agent/requester @ org-a.test or org-b.test) or ask an admin to invite you.",
  forbidden: "You do not have access to that area. Sign in with an account that has the right role.",
};

export function messageFromSignInQuery(code: string | null | undefined): string | null {
  if (!code) return null;
  return SIGN_IN_QUERY_MESSAGES[code] ?? "Please sign in to continue.";
}
