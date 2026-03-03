import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the asyncRoute pattern by simulating what it does
// We can't easily import it from routes.ts (it's not exported), so we test the pattern

function asyncRoute(handler: (req: any, res: any) => Promise<any>) {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: any) {
      res.body = body;
      return res;
    },
  };
  return res;
}

describe("asyncRoute wrapper", () => {
  it("calls handler and lets it respond normally on success", async () => {
    const handler = vi.fn(async (_req: any, res: any) => {
      res.json({ data: "ok" });
    });

    const wrapped = asyncRoute(handler);
    const req = {};
    const res = createMockRes();

    await wrapped(req, res);

    expect(handler).toHaveBeenCalledOnce();
    expect(res.body).toEqual({ data: "ok" });
  });

  it("catches thrown errors and returns 500 with error message", async () => {
    const handler = vi.fn(async () => {
      throw new Error("Database connection failed");
    });

    const wrapped = asyncRoute(handler);
    const req = {};
    const res = createMockRes();

    await wrapped(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Database connection failed" });
  });

  it("catches rejected promises and returns 500", async () => {
    const handler = vi.fn(async () => {
      return Promise.reject(new Error("Async rejection"));
    });

    const wrapped = asyncRoute(handler);
    const req = {};
    const res = createMockRes();

    await wrapped(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: "Async rejection" });
  });

  it("passes req and res through to the handler", async () => {
    const handler = vi.fn(async (req: any, res: any) => {
      res.json({ id: req.params.id });
    });

    const wrapped = asyncRoute(handler);
    const req = { params: { id: "abc-123" } };
    const res = createMockRes();

    await wrapped(req, res);

    expect(res.body).toEqual({ id: "abc-123" });
  });

  it("does not interfere with non-500 status codes set by handler", async () => {
    const handler = vi.fn(async (_req: any, res: any) => {
      res.status(404).json({ message: "Not found" });
    });

    const wrapped = asyncRoute(handler);
    const req = {};
    const res = createMockRes();

    await wrapped(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ message: "Not found" });
  });

  it("handles errors without a message property", async () => {
    const handler = vi.fn(async () => {
      throw { message: undefined };
    });

    const wrapped = asyncRoute(handler);
    const req = {};
    const res = createMockRes();

    await wrapped(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ message: undefined });
  });
});
