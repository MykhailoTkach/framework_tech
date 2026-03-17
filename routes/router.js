import send from "#utils/send";
import { getPathname } from "#utils/parseUrl";
import {
  handleGetBooks,
  handlePostBook,
  handlePatchBook,
  handlePutBook,
  handleDeleteBook,
} from "#controllers";

const START_TIME = Date.now();

function handleHealth(req, res) {
  const mem = process.memoryUsage();
  send(res, 200, {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: `${((Date.now() - START_TIME) / 1000).toFixed(2)}s`,
    memoryUsage: {
      rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    },
  });
}

async function router(req, res) {
  res.req = req;

  const method = req.method;
  const pathname = getPathname(req.url);

  if (pathname === "/health" && method === "GET") {
    return handleHealth(req, res);
  }

  if (pathname === "/books") {
    if (method === "GET") return handleGetBooks(req, res);
    if (method === "POST") return handlePostBook(req, res);
    return send(res, 405, {
      error: "Method Not Allowed. Use GET or POST on /books.",
    });
  }

  const bookIdMatch = pathname.match(/^\/books\/(\d+)$/);
  if (bookIdMatch) {
    const id = parseInt(bookIdMatch[1]);
    if (method === "PATCH") return handlePatchBook(req, res, id);
    if (method === "PUT") return handlePutBook(req, res, id);
    if (method === "DELETE") return handleDeleteBook(req, res, id);
    return send(res, 405, {
      error: "Method Not Allowed. Use PATCH, PUT, or DELETE on /books/:id.",
    });
  }

  send(res, 404, {
    error: "Route not found. Available: /health, /books, /books/:id",
  });
}

export default router;
