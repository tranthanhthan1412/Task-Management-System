import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openapi } from "./openapi.js";

export const docsRouter = Router();
docsRouter.get("/openapi.json", (_req, res) => res.json(openapi));
docsRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: "TaskPilot API",
  swaggerOptions: {
    validatorUrl: null,
    withCredentials: true,
    persistAuthorization: false,
    displayRequestDuration: true,
    filter: true,
    requestInterceptor: function (request) {
      request.headers["X-Requested-With"] = "XMLHttpRequest";
      return request;
    },
  },
}));
