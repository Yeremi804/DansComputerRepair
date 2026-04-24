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

  test("rejects requests with invalid JSON bodies", async () => {
    const req = {
      json: jest.fn().mockRejectedValue(new Error("Unexpected token")),
      cookies: {
        get: jest.fn(),
      },
    };

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      ok: false,
      error: "Invalid JSON",
    });
    expect(createServerClient).not.toHaveBeenCalled();
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

  test("passes request cookie helpers to Supabase so auth cookies can be read and updated", async () => {
    const setSession = jest.fn().mockResolvedValue({ error: null });
    const getCookie = jest.fn().mockReturnValue({ value: "existing-cookie" });

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
        get: getCookie,
      },
    };

    const res = await POST(req);
    const [, , options] = createServerClient.mock.calls[0];
    const cookieBridge = options.cookies;

    expect(cookieBridge.get("sb-access-token")).toBe("existing-cookie");
    expect(getCookie).toHaveBeenCalledWith("sb-access-token");

    cookieBridge.set("sb-access-token", "fresh-cookie", { path: "/", httpOnly: true });
    expect(res.cookies.get("sb-access-token")).toMatchObject({
      name: "sb-access-token",
      value: "fresh-cookie",
      path: "/",
    });

    cookieBridge.remove("sb-refresh-token", { path: "/" });
    expect(res.cookies.get("sb-refresh-token")).toMatchObject({
      name: "sb-refresh-token",
      value: "",
      path: "/",
    });
    expect(setSession).toHaveBeenCalledWith({
      access_token: "access-token",
      refresh_token: "refresh-token",
    });
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
