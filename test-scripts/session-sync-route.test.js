/**
 * @jest-environment node
 */

import { POST } from "../src/app/api/session/sync/route";
import { createServerClient } from "@supabase/ssr";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

describe("Session sync route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects requests that do not include both auth tokens", async () => {
    const req = {
      json: jest.fn().mockResolvedValue({ access_token: "access-only" }),
      cookies: {
        get: jest.fn(),
      },
    };

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "Missing tokens",
    });
    expect(createServerClient).not.toHaveBeenCalled();
  });

  test("stores the session tokens so protected pages can stay accessible after refresh", async () => {
    const setSession = jest.fn().mockResolvedValue({ error: null });

    createServerClient.mockReturnValue({
      auth: {
        setSession,
      },
    });

    const req = {
      json: jest.fn().mockResolvedValue({
        access_token: "access-token",
        refresh_token: "refresh-token",
      }),
      cookies: {
        get: jest.fn(),
      },
    };

    const res = await POST(req);

    expect(createServerClient).toHaveBeenCalledTimes(1);
    expect(setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  test("returns an error when Supabase rejects the session update", async () => {
    const setSession = jest.fn().mockResolvedValue({
      error: { message: "Session update failed" },
    });

    createServerClient.mockReturnValue({
      auth: {
        setSession,
      },
    });

    const req = {
      json: jest.fn().mockResolvedValue({
        access_token: "access-token",
        refresh_token: "refresh-token",
      }),
      cookies: {
        get: jest.fn(),
      },
    };

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "Session update failed",
    });
  });
});
