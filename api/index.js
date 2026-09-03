import { createRequestHandler } from "@react-router/node";

export default createRequestHandler({
  build: () => import("../build/server/index.js"),
});
