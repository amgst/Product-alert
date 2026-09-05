import { createRequestListener } from "@react-router/node";
import * as build from "../build/server/index.js";

const handler = createRequestListener({ build });

// Vercel terminates TLS at its edge and forwards requests to this function over a
// plain internal connection, so req.socket.encrypted is always false here even for
// real HTTPS requests. @mjackson/node-fetch-server (used under the hood by
// @react-router/node) relies on that flag to decide whether to build the request
// URL as http:// or https://, and gets it wrong — which then makes React Router's
// built-in CSRF check (which compares the browser's real "https://" Origin header
// against that reconstructed URL's origin) reject every POST/action request with a
// 400, since http:// never matches https://. Trusting Vercel's own x-forwarded-proto
// header here fixes the scheme before react-router ever builds the request.
export default function handleRequest(req, res) {
  if (req.headers["x-forwarded-proto"] === "https") {
    req.socket.encrypted = true;
  }
  return handler(req, res);
}
