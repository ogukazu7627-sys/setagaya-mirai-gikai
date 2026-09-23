import "server-only";

import { YouthDialogueEventPage } from "@/features/events/youth-dialogue/client/youth-dialogue-event-page";
import {
  YOUTH_DIALOGUE_EVENT,
  YOUTH_DIALOGUE_REGISTRATION,
} from "@/features/events/youth-dialogue/shared/event-details";
import { getRegistrationStatus } from "@/features/events/youth-dialogue/shared/utils/get-registration-status";

export function YouthDialogueEvent() {
  const registrationStatus = getRegistrationStatus({
    now: new Date(),
    startsAt: YOUTH_DIALOGUE_EVENT.startsAt,
    endsAt: YOUTH_DIALOGUE_EVENT.endsAt,
    ...YOUTH_DIALOGUE_REGISTRATION,
  });

  return <YouthDialogueEventPage registrationStatus={registrationStatus} />;
}
