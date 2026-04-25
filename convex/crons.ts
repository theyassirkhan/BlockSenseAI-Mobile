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

// Daily tanker need predictions 6am IST (0:30am UTC)
crons.daily(
  "daily tanker predictions",
  { hourUTC: 0, minuteUTC: 30 },
  internal.predictions.runDailyTankerPredictions
);

// Weekly digest every Sunday 8am IST (2:30am UTC)
crons.weekly(
  "weekly digest",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 30 },
  internal.notifications.sendWeeklyDigest
);

// Weekly wipe of anonymous demo session users (Sunday midnight UTC)
crons.weekly(
  "weekly demo wipe",
  { dayOfWeek: "sunday", hourUTC: 0, minuteUTC: 0 },
  internal.demo.wipeDemoNamedUsersInternal
);

export default crons;
