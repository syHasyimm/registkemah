export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    process.env.CAMP_WORKER_DISABLED !== "true"
  ) {
    const { startCampWorker } = await import("./services/camp-jobs.service");
    startCampWorker();
  }
}
