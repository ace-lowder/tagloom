import { describe, expect, it } from "vitest";
import { isEmailVerified, toCurrentUser } from "./auth";

describe("auth helpers", () => {
  it("treats unverified users as unavailable", () => {
    expect(isEmailVerified({ id: "u", email_confirmed_at: null } as never)).toBe(
      false,
    );
    expect(toCurrentUser({ id: "u", email: "user@example.com", email_confirmed_at: null } as never)).toBeNull();
  });
});

