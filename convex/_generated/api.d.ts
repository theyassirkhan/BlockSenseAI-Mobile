/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminTickets from "../adminTickets.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as broadcastsService from "../broadcastsService.js";
import type * as complaints from "../complaints.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as garbage from "../garbage.js";
import type * as gas from "../gas.js";
import type * as http from "../http.js";
import type * as notices from "../notices.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as power from "../power.js";
import type * as predictions from "../predictions.js";
import type * as reports from "../reports.js";
import type * as serviceRequests from "../serviceRequests.js";
import type * as sewage from "../sewage.js";
import type * as shifts from "../shifts.js";
import type * as societies from "../societies.js";
import type * as societies_internal from "../societies_internal.js";
import type * as staff from "../staff.js";
import type * as users from "../users.js";
import type * as vehicles from "../vehicles.js";
import type * as vendors from "../vendors.js";
import type * as visitors from "../visitors.js";
import type * as waste from "../waste.js";
import type * as water from "../water.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminTickets: typeof adminTickets;
  alerts: typeof alerts;
  auth: typeof auth;
  broadcastsService: typeof broadcastsService;
  complaints: typeof complaints;
  crons: typeof crons;
  demo: typeof demo;
  garbage: typeof garbage;
  gas: typeof gas;
  http: typeof http;
  notices: typeof notices;
  notifications: typeof notifications;
  payments: typeof payments;
  power: typeof power;
  predictions: typeof predictions;
  reports: typeof reports;
  serviceRequests: typeof serviceRequests;
  sewage: typeof sewage;
  shifts: typeof shifts;
  societies: typeof societies;
  societies_internal: typeof societies_internal;
  staff: typeof staff;
  users: typeof users;
  vehicles: typeof vehicles;
  vendors: typeof vendors;
  visitors: typeof visitors;
  waste: typeof waste;
  water: typeof water;
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
