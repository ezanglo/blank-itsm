import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "./context";

export function redirectToSignIn(reason: "session" | "membership" | "forbidden" | "unknown"): never {
  redirect(`/sign-in?error=${reason}`);
}

export function handleAuthLayoutFailure(error: unknown): never {
  if (error instanceof UnauthorizedError) {
    redirectToSignIn("session");
  }
  if (error instanceof ForbiddenError) {
    const message = error.message.toLowerCase();
    if (message.includes("membership")) {
      redirectToSignIn("membership");
    }
    redirectToSignIn("forbidden");
  }
  redirectToSignIn("unknown");
}
