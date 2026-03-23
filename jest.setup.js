import "@testing-library/jest-dom";

// Provide safe default Supabase env variables during Jest runs
// to avoid "supabaseUrl is required" when client module is imported.
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "fake-anon-key";

// Polyfill request APIs used by Next.js server and route handlers in Jest.
try {
  const { Request: NodeRequest, Response: NodeResponse, Headers: NodeHeaders } = require("undici");
  global.Request = global.Request || NodeRequest;
  global.Response = global.Response || NodeResponse;
  global.Headers = global.Headers || NodeHeaders;
} catch {
  // In environments without undici, use lightweight built-ins.
  if (typeof global.Request === "undefined") {
    global.Request = class {
      constructor(url) { this.url = url; }
    };
  }
  if (typeof global.Response === "undefined") {
    global.Response = class {
      constructor(body, init = {}) {
        this._body = body;
        this.status = init.status || 200;
        this.headers = init.headers || {};
      }
      async json() { return JSON.parse(this._body); }
      text() { return Promise.resolve(this._body); }
    };
  }
  if (typeof global.Headers === "undefined") {
    global.Headers = class {
      constructor(init = {}) { this._headers = init; }
      get(key) { return this._headers[key.toLowerCase()]; }
    };
  }
}

