const http = require("http");
const fs = require("fs");
const path = require("path");

// Load .env manually (no dotenv package)
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const HOSTNAME = process.env.HOSTNAME || "localhost";
const PORT = parseInt(process.env.PORT) || 3000;

//  In-memory "database"
let books = [{ id: 1, title: "Kobzar", author: "Shevchenko", year: 1840 }];
let nextId = 2;

//  Helpers
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

// Validation
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
    if (typeof fields.title !== "string" || fields.title.trim() === "") {
      errors.push('"title" must be a non-empty string.');
    }
  }

  if (fields.author !== undefined) {
    if (typeof fields.author !== "string" || fields.author.trim() === "") {
      errors.push('"author" must be a non-empty string.');
    }
  }

  if (fields.year !== undefined) {
    if (
      !Number.isInteger(fields.year) ||
      fields.year < 0 ||
      fields.year > CURRENT_YEAR
    ) {
      errors.push(`"year" must be an integer between 0 and ${CURRENT_YEAR}.`);
    }
  }

  return errors;
}

// Route handlers

// GET /books?author=Shevchenko
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

// POST /books
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

// PATCH /books/:id   update one or more fields (except id)
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

// PUT /books/:id   full replacement (except id)
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

// DELETE /books/:id
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

// Router
const server = http.createServer(async (req, res) => {
  const method = req.method;
  const pathname = getPathname(req.url);

  // /books
  if (pathname === "/books") {
    if (method === "GET") return handleGetBooks(req, res);
    if (method === "POST") return handlePostBook(req, res);
    return send(res, 405, {
      error: "Method Not Allowed. Use GET or POST on /books.",
    });
  }

  // /books/:id
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

  send(res, 404, { error: "Route not found. Available: /books, /books/:id" });
});

//  Start
server.listen(PORT, HOSTNAME, () => {
  console.log(`Book Catalog server running at http://${HOSTNAME}:${PORT}`);
  console.log("Available endpoints:");
  console.log(
    `  GET    /books?author=<name>  — search by author (or list all)`,
  );
  console.log(`  POST   /books                — add a new book`);
  console.log(`  PATCH  /books/:id            — partial update`);
  console.log(`  PUT    /books/:id            — full update`);
  console.log(`  DELETE /books/:id            — delete a book`);
});
