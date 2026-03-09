"use strict";

const http = require("http");

const config = require("./config");
const logger = require("./logger");

let books = [{ id: 1, title: "Kobzar", author: "Shevchenko", year: 1840 }];
let nextId = 2;

const START_TIME = Date.now();

function getBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);

  const method = res.req ? res.req.method : "?";
  const pathname = res.req ? getPathname(res.req.url) : "/";
  logger.logRequest(method, pathname, status);
}

function parseQuery(url) {
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return {};
  const query = {};
  url
    .slice(qIndex + 1)
    .split("&")
    .forEach((pair) => {
      const [k, v] = pair.split("=");
      if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
    });
  return query;
}

function getPathname(url) {
  const qIndex = url.indexOf("?");
  return qIndex === -1 ? url : url.slice(0, qIndex);
}

const CURRENT_YEAR = new Date().getFullYear();

function validateBookFields(fields, requireAll = false) {
  const errors = [];
  const allowed = ["title", "author", "year"];

  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) {
      errors.push(`Field "${key}" is not allowed.`);
    }
  }

  if (requireAll) {
    if (!fields.title && fields.title !== 0)
      errors.push('"title" is required.');
    if (!fields.author && fields.author !== 0)
      errors.push('"author" is required.');
    if (fields.year === undefined) errors.push('"year" is required.');
  }

  if (fields.title !== undefined) {
    if (typeof fields.title !== "string" || fields.title.trim() === "")
      errors.push('"title" must be a non-empty string.');
  }

  if (fields.author !== undefined) {
    if (typeof fields.author !== "string" || fields.author.trim() === "")
      errors.push('"author" must be a non-empty string.');
  }

  if (fields.year !== undefined) {
    if (
      !Number.isInteger(fields.year) ||
      fields.year < 0 ||
      fields.year > CURRENT_YEAR
    )
      errors.push(`"year" must be an integer between 0 and ${CURRENT_YEAR}.`);
  }

  return errors;
}

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

function handleGetBooks(req, res) {
  const query = parseQuery(req.url);

  if (Object.keys(query).length > 0 && !query.author) {
    return send(res, 400, {
      error: "Unknown query parameter. Allowed: author.",
    });
  }

  if (query.author !== undefined) {
    if (query.author.trim() === "") {
      return send(res, 400, {
        error: '"author" query param must not be empty.',
      });
    }
    const result = books.filter(
      (b) => b.author.toLowerCase() === query.author.toLowerCase(),
    );
    return send(res, 200, result);
  }

  send(res, 200, books);
}

async function handlePostBook(req, res) {
  let body;
  try {
    body = await getBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body." });
  }

  const errors = validateBookFields(body, true);
  if (errors.length > 0) return send(res, 400, { errors });

  const book = {
    id: nextId++,
    title: body.title.trim(),
    author: body.author.trim(),
    year: body.year,
  };

  books.push(book);
  send(res, 201, book);
}

async function handlePatchBook(req, res, id) {
  const book = books.find((b) => b.id === id);
  if (!book) return send(res, 404, { error: `Book with id ${id} not found.` });

  let body;
  try {
    body = await getBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body." });
  }

  if (Object.keys(body).length === 0) {
    return send(res, 400, {
      error: "Request body must contain at least one field to update.",
    });
  }

  if ("id" in body) {
    return send(res, 400, { error: 'Updating "id" is not allowed.' });
  }

  const errors = validateBookFields(body, false);
  if (errors.length > 0) return send(res, 400, { errors });

  if (body.title !== undefined) book.title = body.title.trim();
  if (body.author !== undefined) book.author = body.author.trim();
  if (body.year !== undefined) book.year = body.year;

  send(res, 200, book);
}

async function handlePutBook(req, res, id) {
  const index = books.findIndex((b) => b.id === id);
  if (index === -1)
    return send(res, 404, { error: `Book with id ${id} not found.` });

  let body;
  try {
    body = await getBody(req);
  } catch {
    return send(res, 400, { error: "Invalid JSON body." });
  }

  if ("id" in body) {
    return send(res, 400, { error: 'Updating "id" is not allowed.' });
  }

  const errors = validateBookFields(body, true);
  if (errors.length > 0) return send(res, 400, { errors });

  books[index] = {
    id,
    title: body.title.trim(),
    author: body.author.trim(),
    year: body.year,
  };

  send(res, 200, books[index]);
}

function handleDeleteBook(req, res, id) {
  const index = books.findIndex((b) => b.id === id);
  if (index === -1)
    return send(res, 404, { error: `Book with id ${id} not found.` });

  const deleted = books.splice(index, 1)[0];
  send(res, 200, {
    message: `Book "${deleted.title}" deleted.`,
    book: deleted,
  });
}

const server = http.createServer(async (req, res) => {
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
});

const SHUTDOWN_TIMEOUT_MS = 10_000;

function gracefulShutdown(signal) {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  const forceExitTimer = setTimeout(() => {
    logger.error("Shutdown timeout exceeded. Forcing exit with code 2.");
    process.exit(2);
  }, SHUTDOWN_TIMEOUT_MS);

  forceExitTimer.unref();

  server.close((err) => {
    if (err) {
      logger.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    }
    logger.info("Server closed successfully. Exiting with code 0.");
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
// node -e "process.kill(pid, 'SIGTERM')"

// setTimeout(() => {
//   throw new Error("test crash");
// }, 5000);
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  gracefulShutdown("uncaughtException");
});

// setTimeout(() => {
//   Promise.reject(new Error("test rejection"));
// }, 5000);
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled Rejection: ${msg}`);
  gracefulShutdown("unhandledRejection");
});

server.listen(config.PORT, config.HOSTNAME, () => {
  logger.info(
    `Book Catalog server running at http://${config.HOSTNAME}:${config.PORT}`,
  );
  logger.info(`Mode: ${config.NODE_ENV}`);
  logger.info("Available endpoints:");
  logger.info("  GET    /health              — process health info");
  logger.info("  GET    /books?author=<n>    — list all or filter by author");
  logger.info("  POST   /books               — create a new book");
  logger.info("  PATCH  /books/:id           — partial update");
  logger.info("  PUT    /books/:id           — full update");
  logger.info("  DELETE /books/:id           — delete a book");
});
