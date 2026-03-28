/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as complaints from "../complaints.js";
import type * as complaintsPipeline from "../complaintsPipeline.js";
import type * as geminiAi from "../geminiAi.js";
import type * as http from "../http.js";
import type * as routing from "../routing.js";
import type * as seed from "../seed.js";
import type * as storageHelpers from "../storageHelpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authActions: typeof authActions;
  complaints: typeof complaints;
  complaintsPipeline: typeof complaintsPipeline;
  geminiAi: typeof geminiAi;
  http: typeof http;
  routing: typeof routing;
  seed: typeof seed;
  storageHelpers: typeof storageHelpers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
