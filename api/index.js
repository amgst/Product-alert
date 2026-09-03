import { createRequestHandler } from "@react-router/node";
import * as buildModule from "../build/server/index.js";

const build = buildModule.default || buildModule;

export default createRequestHandler({
  build,
});
