import { createAuthClient } from "better-auth/react";
import { getClientAuthBaseURL } from "./settings";

export const authClient = createAuthClient({
  baseURL: getClientAuthBaseURL(),
});

export const { useSession, signIn, signOut, signUp } = authClient;
