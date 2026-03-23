import { middleware } from "../src/middleware";
import { NextResponse } from "next/server";

const getUserMock = jest.fn();

const mockClient = {
  auth: { getUser: getUserMock },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { role: "admin" } }),
};

jest.mock("@supabase/ssr", () => ({
  createServerClient: () => mockClient,
}));

function makeReq(pathname) {
  return {
    url: `http://localhost${pathname}`,
    nextUrl: new URL(`http://localhost${pathname}`),
    cookies: { get: () => undefined, set: jest.fn() },
  };
}

test("redirects unauthenticated admin route user to login", async () => {
  getUserMock.mockResolvedValue({ data: { user: null } });
  const res = await middleware(makeReq("/dashboard"));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain("/admin-log-in");
});

test("redirects non-admin authenticated user to /", async () => {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });

  mockClient.single.mockResolvedValueOnce({ data: { role: "user" }, error: null });

  const res = await middleware(makeReq("/dashboard"));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toBe("http://localhost/");
});

test("allows authenticated admin route", async () => {
  getUserMock.mockResolvedValue({ data: { user: { id: "abc" } } });
  const res = await middleware(makeReq("/dashboard"));
  expect(res.status).toBe(200);
});

test("redirects non-admin authenticated user from /dashboard/metric to /", async () => {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  mockClient.single.mockResolvedValueOnce({ data: { role: "user" }, error: null });

  const res = await middleware(makeReq("/dashboard/metric"));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toBe("http://localhost/");
});

test("redirects non-admin authenticated user from /admin-parts to /", async () => {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
  mockClient.single.mockResolvedValueOnce({ data: { role: "user" }, error: null });

  const res = await middleware(makeReq("/admin-parts"));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toBe("http://localhost/");
});

test("allow authenticated admin user to access /dashboard/metric", async () => {
  getUserMock.mockResolvedValue({ data: { user: { id: "admin-123" } } });
  mockClient.single.mockResolvedValueOnce({ data: { role: "admin" }, error: null });

  const res = await middleware(makeReq("/dashboard/metric"));
  expect(res.status).toBe(200);
  expect(res.headers.get("location")).toBeNull();
});