import { createInterviewRoutes } from "@/features/public-comment/shared/server/interview-routes";

export const POST = createInterviewRoutes("inclusion-plan").session;
