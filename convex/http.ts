import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Registers /.well-known/openid-configuration and /.well-known/jwks.json
// so the Convex backend can verify JWTs issued by this auth provider.
auth.addHttpRoutes(http);

export default http;
