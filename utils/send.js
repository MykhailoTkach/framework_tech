import * as logger from "#logger";
import { getPathname } from "#utils/parseUrl";

export default function send(res, status, data) {
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
