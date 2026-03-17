import config from "#config";

function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const HH = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${HH}:${min}:${ss}`;
}

function log(level, message) {
  const line = `[${formatDate(new Date())}] [${level}] ${message}`;
  level === "ERROR" ? console.error(line) : console.log(line);
}

function logRequest(method, pathname, status) {
  const level = status >= 400 ? "ERROR" : "INFO";
  const message = `- - > ${method} ${pathname} | Status: ${status}`;
  if (config.IS_DEV) {
    log(level, message);
  } else if (config.IS_PROD && status >= 400) {
    log(level, message);
  }
}

function info(message) {
  log("INFO", message);
}
function warn(message) {
  log("WARN", message);
}
function error(message) {
  log("ERROR", message);
}

export { logRequest, info, warn, error };
