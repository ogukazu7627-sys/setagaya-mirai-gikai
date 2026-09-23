export type RegistrationStatus = "open" | "closed" | "full" | "ended";

export function getRegistrationStatus(params: {
  now: Date;
  startsAt: Date;
  endsAt: Date;
  registrationClosesAt: Date | null;
  manualStatus: "full" | "closed" | null;
}): RegistrationStatus {
  const { now, startsAt, endsAt, registrationClosesAt, manualStatus } = params;
  if (now >= endsAt) return "ended";
  if (now >= startsAt) return "closed";
  if (manualStatus) return manualStatus;
  if (registrationClosesAt && now >= registrationClosesAt) return "closed";
  return "open";
}
