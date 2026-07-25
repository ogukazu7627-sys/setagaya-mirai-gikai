import {
  getRecommendationCategoryById,
  type RecommendationCategoryId,
  type RecommendationSmallTag,
} from "../constants/recommendation-taxonomy";
import type {
  RecommendationCandidate,
  RecommendationPick,
} from "../types/recommendation";
import { orderDeterministically } from "./deterministic-order";

type SelectionInput = {
  candidates: RecommendationCandidate[];
  selectedSmallTags: RecommendationSmallTag[];
  selectedParentCategoryIds: RecommendationCategoryId[];
  displayedBillIds: ReadonlySet<string>;
  seed: string;
  limit?: number;
};

export function selectDailyRecommendations({
  candidates,
  selectedSmallTags,
  selectedParentCategoryIds,
  displayedBillIds,
  seed,
  limit = 5,
}: SelectionInput): RecommendationPick[] {
  const eligible = Array.from(
    new Map(
      candidates
        .filter((candidate) => !displayedBillIds.has(candidate.id))
        .map((candidate) => [candidate.id, candidate])
    ).values()
  );
  const chosen = new Map<string, RecommendationPick>();

  for (const candidate of pickMaximumSelectedTagCoverage(
    eligible,
    selectedSmallTags,
    seed
  )) {
    chosen.set(candidate.id, {
      billId: candidate.id,
      source: "selected-subcategory",
    });
  }

  const selectedTagSet = new Set<string>(selectedSmallTags);
  addFromPool({
    chosen,
    pool: eligible.filter((candidate) =>
      candidate.tags.some((tag) => selectedTagSet.has(tag))
    ),
    targetSize: Math.min(3, limit),
    source: "selected-subcategory",
    seed: `${seed}:selected-fill`,
  });

  const parentTagSet = new Set(
    selectedParentCategoryIds.flatMap(
      (id) => getRecommendationCategoryById(id)?.smallTags ?? []
    )
  );

  addFromPool({
    chosen,
    pool: eligible.filter((candidate) =>
      candidate.tags.some(
        (tag) => parentTagSet.has(tag) && !selectedTagSet.has(tag)
      )
    ),
    targetSize: limit,
    source: "parent-category",
    seed: `${seed}:parent-unselected`,
  });

  addFromPool({
    chosen,
    pool: eligible.filter((candidate) =>
      candidate.tags.some((tag) => parentTagSet.has(tag))
    ),
    targetSize: limit,
    source: "parent-category",
    seed: `${seed}:parent-all`,
  });

  return orderDeterministically(
    Array.from(chosen.values()).slice(0, limit),
    `${seed}:final`,
    (pick) => pick.billId
  );
}

function pickMaximumSelectedTagCoverage(
  candidates: RecommendationCandidate[],
  selectedTags: RecommendationSmallTag[],
  seed: string
): RecommendationCandidate[] {
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.id, candidate])
  );
  const options = selectedTags.map((tag) =>
    orderDeterministically(
      candidates.filter((candidate) => candidate.tags.includes(tag)),
      `${seed}:tag:${tag}`,
      (candidate) => candidate.id
    )
  );
  const matchedTagByCandidateId = new Map<string, number>();
  const matchedCandidateIdByTag = new Map<number, string>();

  function assignCandidate(
    tagIndex: number,
    visitedCandidateIds: Set<string>
  ): boolean {
    for (const candidate of options[tagIndex] ?? []) {
      if (visitedCandidateIds.has(candidate.id)) {
        continue;
      }
      visitedCandidateIds.add(candidate.id);

      const displacedTagIndex = matchedTagByCandidateId.get(candidate.id);
      if (
        displacedTagIndex === undefined ||
        assignCandidate(displacedTagIndex, visitedCandidateIds)
      ) {
        matchedTagByCandidateId.set(candidate.id, tagIndex);
        matchedCandidateIdByTag.set(tagIndex, candidate.id);
        return true;
      }
    }
    return false;
  }

  for (let tagIndex = 0; tagIndex < options.length; tagIndex += 1) {
    assignCandidate(tagIndex, new Set());
  }

  return selectedTags
    .map((_, tagIndex) => matchedCandidateIdByTag.get(tagIndex))
    .filter((candidateId): candidateId is string => candidateId != null)
    .map((candidateId) => candidateById.get(candidateId))
    .filter(
      (candidate): candidate is RecommendationCandidate => candidate != null
    );
}

function addFromPool({
  chosen,
  pool,
  targetSize,
  source,
  seed,
}: {
  chosen: Map<string, RecommendationPick>;
  pool: RecommendationCandidate[];
  targetSize: number;
  source: RecommendationPick["source"];
  seed: string;
}) {
  for (const candidate of orderDeterministically(
    pool,
    seed,
    (item) => item.id
  )) {
    if (chosen.size >= targetSize) {
      return;
    }
    if (!chosen.has(candidate.id)) {
      chosen.set(candidate.id, { billId: candidate.id, source });
    }
  }
}
