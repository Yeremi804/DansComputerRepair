/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";
import { createServerClient } from "@supabase/ssr";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}));

function buildProfileLookup(result) {
  const single = jest.fn().mockResolvedValue(result);
  const eq = jest.fn().mockReturnValue({ single });
  const select = jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ select });

  return { from, select, eq, single };
}

describe("Session management middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("redirects to the login page when the session is missing or expired", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
      from: jest.fn(),
    });

    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = await middleware(req);

    expect(res.headers.get("location")).toContain("/admin-log-in");
    expect(res.headers.get("location")).toContain("redirectTo=%2Fdashboard");
  });

  test("redirects authenticated non-admin users away from protected routes", async () => {
    const profileLookup = buildProfileLookup({
      data: { role: "customer" },
      error: null,
    });

    createServerClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
        }),
      },
      from: profileLookup.from,
    });

    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = await middleware(req);

    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    expect(profileLookup.from).toHaveBeenCalledWith("profiles");
  });

  test("allows admin users to stay logged in across repeated protected requests", async () => {
    const profileLookup = buildProfileLookup({
      data: { role: "admin" },
      error: null,
    });
    const getUser = jest.fn().mockResolvedValue({
      data: { user: { id: "admin-1" } },
    });

    createServerClient.mockReturnValue({
      auth: {
        getUser,
      },
      from: profileLookup.from,
    });

    const firstRes = await middleware(
      new NextRequest("http://localhost:3000/dashboard")
    );
    const secondRes = await middleware(
      new NextRequest("http://localhost:3000/dashboard/customer-messages")
    );

    expect(firstRes.headers.get("location")).toBeNull();
    expect(secondRes.headers.get("location")).toBeNull();
    expect(getUser).toHaveBeenCalledTimes(2);
    expect(profileLookup.from).toHaveBeenCalledTimes(2);
  });
});
