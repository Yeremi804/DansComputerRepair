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

  // Ensure Response.json exists even if undici version is older
  if (global.Response && !global.Response.json) {
    global.Response.json = (data, init = {}) => {
      const body = JSON.stringify(data);
      const headers = new global.Headers(init.headers);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      return new global.Response(body, { ...init, headers });
    };
  }
} catch {
  // In environments without undici, use lightweight built-ins.
  if (typeof global.Headers === "undefined") {
    global.Headers = class {
      constructor(init = {}) {
        this._headers = new Map();
        if (init) {
          if (init instanceof Map || init instanceof global.Headers) {
            init.forEach((v, k) => this._headers.set(k.toLowerCase(), v));
          } else {
            Object.entries(init).forEach(([k, v]) => this._headers.set(k.toLowerCase(), v));
          }
        }
      }
      get(key) { return this._headers.get(key.toLowerCase()) || null; }
      set(key, value) { this._headers.set(key.toLowerCase(), value); }
      has(key) { return this._headers.has(key.toLowerCase()); }
      forEach(cb) { this._headers.forEach((v, k) => cb(v, k)); }
    };
  }

  if (typeof global.Response === "undefined") {
    global.Response = class {
      constructor(body, init = {}) {
        this._body = body;
        this.status = init.status || 200;
        this.headers = new global.Headers(init.headers);
      }
      async json() { return JSON.parse(this._body); }
      async text() { return this._body; }
      static json(data, init = {}) {
        const body = JSON.stringify(data);
        const headers = new global.Headers(init.headers);
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }
        return new global.Response(body, { ...init, headers });
      }
    };
  }

  if (typeof global.Request === "undefined") {
    global.Request = class {
      constructor(url, init = {}) {
        this.url = url;
        this.method = init.method || "GET";
        this.headers = new global.Headers(init.headers);
      }
    };
  }
}

// Polyfill for scrollIntoView which is missing in jsdom
if (typeof window !== "undefined") {
  if (!window.Element.prototype.scrollIntoView) {
    window.Element.prototype.scrollIntoView = jest.fn();
  }
}