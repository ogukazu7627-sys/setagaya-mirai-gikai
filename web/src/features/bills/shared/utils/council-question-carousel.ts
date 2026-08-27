type CouncilQuestionCouncilorGroup = {
  councilor: {
    id: string;
  };
};

const MAX_RENDERED_COUNCILOR_SLIDES = 3;

export function getCouncilQuestionCarouselWindow<
  T extends CouncilQuestionCouncilorGroup,
>(groups: readonly T[], activeCouncilorId: string): T[] {
  if (groups.length <= MAX_RENDERED_COUNCILOR_SLIDES) {
    return [...groups];
  }

  const foundIndex = groups.findIndex(
    (group) => group.councilor.id === activeCouncilorId
  );
  const activeIndex = foundIndex >= 0 ? foundIndex : 0;
  const startIndex = Math.max(
    0,
    Math.min(activeIndex - 1, groups.length - MAX_RENDERED_COUNCILOR_SLIDES)
  );

  return groups.slice(startIndex, startIndex + MAX_RENDERED_COUNCILOR_SLIDES);
}
