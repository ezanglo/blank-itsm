import { describe, expect, it } from "vitest";
import { messageFromAuthError, messageFromSignInQuery } from "@/lib/auth/form-errors";

describe("form-errors", () => {
  it("maps invalid credentials", () => {
    expect(
      messageFromAuthError({ code: "INVALID_EMAIL_OR_PASSWORD", message: "x" })
    ).toMatch(/invalid email or password/i);
  });

  it("maps sign-in query codes", () => {
    expect(messageFromSignInQuery("session")).toMatch(/session expired/i);
    expect(messageFromSignInQuery("membership")).toMatch(/organization membership/i);
  });
});
