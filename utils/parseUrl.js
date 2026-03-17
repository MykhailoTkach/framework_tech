"use strict";

function getPathname(url) {
  const qIndex = url.indexOf("?");
  return qIndex === -1 ? url : url.slice(0, qIndex);
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

module.exports = { getPathname, parseQuery };
