import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerRoutes } from "./routes";

type Bindings = {
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();
app.use("*", cors());

registerRoutes(app);

// Health endpoint
app.get("/health", (c) =>
  c.json({ status: "ok", service: "chittymarket", version: "1.0.0" })
);

export default app;
