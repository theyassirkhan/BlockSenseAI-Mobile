import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Prediction engine every 15 minutes
crons.interval(
  "prediction engine",
  { minutes: 15 },
  internal.predictions.runAll
);

// Missed garbage check every hour
crons.interval(
  "garbage missed check",
  { hours: 1 },
  internal.garbage.checkMissedCollections
);

// Weekly digest every Sunday 8am IST (2:30am UTC)
crons.weekly(
  "weekly digest",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 30 },
  internal.notifications.sendWeeklyDigest
);

export default crons;
