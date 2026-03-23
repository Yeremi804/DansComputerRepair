import { GET } from "../src/app/api/options/route";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => {
    const query = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [{ id: 1, name: "item" }], error: null }),
    };
    return {
      from: jest.fn().mockReturnValue(query),
    };
  }),
}));

describe("API route /api/options", () => {
  function mockRequest(url) {
    return { url };
  }

  test("GET without type returns 400", async () => {
    const req = mockRequest("http://localhost/api/options");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  test("GET with unknown type returns 400", async () => {
    const req = mockRequest("http://localhost/api/options?type=invalid");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  test("GET with valid type returns 200", async () => {
    const req = mockRequest("http://localhost/api/options?type=cpu");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
  });

  test("GET returns 500 when supabase returns error", async () => {
    const { createClient } = require("@supabase/supabase-js");
    createClient.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: { message: "rate limit exceeded" } }),
      }),
    });

    let GET;
    jest.isolateModules(() => {
      GET = require("../src/app/api/options/route").GET;
    });

    const req = mockRequest("http://localhost/api/options?type=cpu");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/rate limit/i);
  });
});