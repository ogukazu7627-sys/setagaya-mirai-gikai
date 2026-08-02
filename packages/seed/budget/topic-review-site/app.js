(() => {
  const PAGE_SIZE = 15;
  const DECISION_LABELS = {
    "": "未判断",
    pending: "未判断",
    approve: "Approve",
    revise: "Revise",
    reject: "Reject",
  };
  const RELATION_LABELS = {
    responds_to: "課題に対応する",
    supports: "課題への対応を支える",
    maintains: "維持する",
    enables: "実施を可能にする",
  };
  const CONFIDENCE_LABELS = {
    high: "確信度 High",
    medium: "確信度 Medium",
    low: "確信度 Low",
  };

  function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`画面要素がありません: ${id}`);
    }
    return element;
  }

  const elements = {
    total: requireElement("summary-total"),
    pending: requireElement("summary-pending"),
    approve: requireElement("summary-approve"),
    revise: requireElement("summary-revise"),
    reject: requireElement("summary-reject"),
    searchInput: requireElement("search-input"),
    categoryFilter: requireElement("category-filter"),
    decisionFilter: requireElement("decision-filter"),
    evidenceFilter: requireElement("evidence-filter"),
    sortSelect: requireElement("sort-select"),
    resetFilters: requireElement("reset-filters"),
    candidateHeading: requireElement("candidate-heading"),
    resultCount: requireElement("result-count"),
    loadingState: requireElement("loading-state"),
    errorState: requireElement("error-state"),
    errorMessage: requireElement("error-message"),
    retryLoad: requireElement("retry-load"),
    emptyState: requireElement("empty-state"),
    candidateList: requireElement("candidate-list"),
    previousPage: requireElement("previous-page"),
    nextPage: requireElement("next-page"),
    pageStatus: requireElement("page-status"),
    dirtyCount: requireElement("dirty-count"),
    saveGuidance: requireElement("save-guidance"),
    saveButton: requireElement("save-button"),
    liveStatus: requireElement("live-status"),
  };

  const state = {
    snapshot: null,
    drafts: new Map(),
    page: 1,
    saving: false,
  };

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function setLiveStatus(message) {
    elements.liveStatus.textContent = "";
    window.setTimeout(() => {
      elements.liveStatus.textContent = message;
    }, 20);
  }

  function normalizeSearchText(value) {
    return String(value)
      .normalize("NFKC")
      .toLocaleLowerCase("ja-JP")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  function formatAmount(value) {
    try {
      return `${new Intl.NumberFormat("ja-JP").format(BigInt(value))}千円`;
    } catch {
      return `${value}千円`;
    }
  }

  function getEffectiveRow(row) {
    const draft = state.drafts.get(row.rowKey);
    return draft ? { ...row, ...draft } : row;
  }

  function editableValues(row) {
    return {
      reviewDecision: row.reviewDecision,
      reviewNote: row.reviewNote,
      proposedRelationType: row.proposedRelationType,
      proposedExplanation: row.proposedExplanation,
    };
  }

  function editableValuesEqual(left, right) {
    return (
      left.reviewDecision === right.reviewDecision &&
      left.reviewNote === right.reviewNote &&
      left.proposedRelationType === right.proposedRelationType &&
      left.proposedExplanation === right.proposedExplanation
    );
  }

  function updateDraft(row, patch) {
    const next = {
      ...editableValues(getEffectiveRow(row)),
      ...patch,
    };
    if (editableValuesEqual(next, editableValues(row))) {
      state.drafts.delete(row.rowKey);
    } else {
      state.drafts.set(row.rowKey, next);
    }
    renderSummary();
    renderSaveBar();
  }

  function calculateEffectiveSummary() {
    const summary = {
      total: 0,
      pending: 0,
      approve: 0,
      revise: 0,
      reject: 0,
    };
    if (!state.snapshot) {
      return summary;
    }
    for (const row of state.snapshot.rows) {
      summary.total += 1;
      const decision = getEffectiveRow(row).reviewDecision;
      if (decision === "") {
        summary.pending += 1;
      } else {
        summary[decision] += 1;
      }
    }
    return summary;
  }

  function renderSummary() {
    const summary = calculateEffectiveSummary();
    elements.total.textContent = String(summary.total);
    elements.pending.textContent = String(summary.pending);
    elements.approve.textContent = String(summary.approve);
    elements.revise.textContent = String(summary.revise);
    elements.reject.textContent = String(summary.reject);
  }

  function matchesFilters(row) {
    const effective = getEffectiveRow(row);
    const category = elements.categoryFilter.value;
    if (category !== "all" && row.categorySlug !== category) {
      return false;
    }
    const evidence = elements.evidenceFilter.value;
    if (evidence !== "all" && row.evidenceLevel !== evidence) {
      return false;
    }
    const decision = elements.decisionFilter.value;
    if (decision !== "all" && effective.reviewDecision !== decision) {
      // 未判断を処理中の候補は、保存するまでは一覧から消さない。
      if (!(decision === "pending" && row.reviewDecision === "")) {
        return false;
      }
    }
    const query = normalizeSearchText(elements.searchInput.value);
    if (query === "") {
      return true;
    }
    const searchable = normalizeSearchText(
      [
        row.displayProgramName,
        row.topicName,
        row.categoryName,
        row.accountName,
        row.kanName,
        row.kouName,
        row.mokuName,
        row.departmentDisplayName,
        effective.proposedExplanation,
      ].join(" ")
    );
    return searchable.includes(query);
  }

  function compareAmountsDescending(left, right) {
    const leftAmount = BigInt(left.amountThousandYen);
    const rightAmount = BigInt(right.amountThousandYen);
    if (leftAmount === rightAmount) {
      return left.displayProgramName.localeCompare(
        right.displayProgramName,
        "ja"
      );
    }
    return leftAmount > rightAmount ? -1 : 1;
  }

  function getFilteredRows() {
    if (!state.snapshot) {
      return [];
    }
    const rows = state.snapshot.rows.filter(matchesFilters);
    if (elements.sortSelect.value === "amount-desc") {
      return rows.sort(compareAmountsDescending);
    }
    if (elements.sortSelect.value === "name") {
      return rows.sort((left, right) =>
        left.displayProgramName.localeCompare(right.displayProgramName, "ja")
      );
    }
    return rows;
  }

  function createTag(text, modifier) {
    return createElement("span", `tag${modifier ? ` ${modifier}` : ""}`, text);
  }

  function appendHierarchy(container, row) {
    const hierarchy = [row.accountName, row.kanName, row.kouName, row.mokuName];
    hierarchy.forEach((value, index) => {
      if (index > 0) {
        container.append(createElement("span", "hierarchy-separator", ">"));
      }
      container.append(createElement("span", "", value));
    });
  }

  function createDecisionOption(row, value, labelText) {
    const option = createElement(
      "label",
      `decision-option decision-option--${value}`
    );
    const input = document.createElement("input");
    input.type = "radio";
    input.name = `decision-${row.rowKey}`;
    input.value = value;
    input.checked = getEffectiveRow(row).reviewDecision === value;
    input.setAttribute(
      "aria-label",
      `${row.displayProgramName}を${labelText}にする`
    );
    input.addEventListener("change", () => {
      const effective = getEffectiveRow(row);
      const patch = {
        reviewDecision: value,
        reviewNote: effective.reviewNote,
        proposedRelationType: effective.proposedRelationType,
        proposedExplanation: effective.proposedExplanation,
      };
      if (value === "approve") {
        patch.reviewNote =
          effective.reviewNote.trim() || "ローカルレビュー画面で承認";
        patch.proposedRelationType = row.proposedRelationType;
        patch.proposedExplanation = row.proposedExplanation;
      } else if (value === "reject") {
        patch.reviewNote =
          effective.reviewNote.trim() || "ローカルレビュー画面で却下";
        patch.proposedRelationType = row.proposedRelationType;
        patch.proposedExplanation = row.proposedExplanation;
      }
      updateDraft(row, patch);
      renderCandidates();
      const selected = document.querySelector(
        `input[name="decision-${CSS.escape(row.rowKey)}"][value="${value}"]`
      );
      selected?.focus();
    });
    option.append(input, createElement("span", "", labelText));
    return option;
  }

  function createReviewNoteField(row) {
    const effective = getEffectiveRow(row);
    const label = createElement("label", "review-note-field");
    const labelText =
      effective.reviewDecision === "reject"
        ? "レビュー注記（任意）"
        : "レビュー注記（必須）";
    label.append(createElement("span", "", labelText));
    const textarea = createElement("textarea", "review-note");
    textarea.value = effective.reviewNote;
    textarea.rows = 2;
    textarea.maxLength = 4000;
    textarea.placeholder =
      effective.reviewDecision === "revise"
        ? "何を修正したかを記録"
        : "判断の記録";
    textarea.setAttribute(
      "aria-label",
      `${row.displayProgramName}のレビュー注記`
    );
    textarea.addEventListener("input", () => {
      updateDraft(row, { reviewNote: textarea.value });
    });
    label.append(textarea);
    return label;
  }

  function createRevisionFields(row) {
    const effective = getEffectiveRow(row);
    const container = createElement("div", "revision-fields");
    container.append(createElement("h4", "", "公開する関係内容の修正"));

    const relationLabel = createElement("label", "");
    relationLabel.append(createElement("span", "", "関係種別"));
    const select = document.createElement("select");
    for (const [value, label] of Object.entries(RELATION_LABELS)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = effective.proposedRelationType === value;
      select.append(option);
    }
    select.addEventListener("change", () => {
      updateDraft(row, { proposedRelationType: select.value });
    });
    relationLabel.append(select);

    const explanationLabel = createElement("label", "");
    explanationLabel.append(createElement("span", "", "公開する説明"));
    const explanation = document.createElement("textarea");
    explanation.value = effective.proposedExplanation;
    explanation.rows = 5;
    explanation.maxLength = 12_000;
    explanation.addEventListener("input", () => {
      updateDraft(row, { proposedExplanation: explanation.value });
    });
    explanationLabel.append(explanation);

    container.append(relationLabel, explanationLabel);
    return container;
  }

  function createCandidateCard(row) {
    const effective = getEffectiveRow(row);
    const card = createElement("article", "candidate-card");
    card.dataset.decision = effective.reviewDecision || "pending";
    card.id = `candidate-${row.rowKey}`;

    const header = createElement("div", "candidate-card__header");
    const titleContainer = createElement("div", "candidate-card__title");
    const meta = createElement("div", "candidate-card__meta");
    meta.append(
      createTag(row.categoryName),
      createTag(row.topicName),
      createTag(
        row.evidenceLevel === "B_strong_structural"
          ? "B 強い構造的根拠"
          : "C 編集判断",
        row.evidenceLevel === "B_strong_structural"
          ? "tag--evidence-b"
          : "tag--evidence-c"
      ),
      createTag(CONFIDENCE_LABELS[row.confidence], "tag--confidence")
    );
    const heading = createElement("h3", "", row.displayProgramName);
    heading.id = `heading-${row.rowKey}`;
    titleContainer.append(meta, heading);
    header.append(
      titleContainer,
      createElement("p", "amount", formatAmount(row.amountThousandYen))
    );

    const hierarchy = createElement("p", "hierarchy-line");
    appendHierarchy(hierarchy, row);
    const department = createElement(
      "p",
      "department-line",
      row.departmentDisplayName || "担当部署表示名なし"
    );

    const contentGrid = createElement("div", "candidate-content-grid");
    const explanation = createElement("div", "candidate-explanation");
    explanation.append(
      createElement("h4", "", "候補とした理由"),
      createElement("p", "", effective.proposedExplanation)
    );
    const evidenceDetails = createElement("details", "evidence-details");
    evidenceDetails.append(
      createElement("summary", "", "根拠に使った公式項目"),
      createElement(
        "pre",
        "evidence-json",
        JSON.stringify(row.evidenceFields, null, 2)
      )
    );
    explanation.append(evidenceDetails);

    const reviewColumn = createElement("div", "candidate-review");
    const fieldset = createElement("fieldset", "decision-panel");
    fieldset.setAttribute("aria-labelledby", heading.id);
    fieldset.append(createElement("legend", "", "判断"));
    const decisionOptions = createElement("div", "decision-options");
    decisionOptions.append(
      createDecisionOption(row, "approve", "Approve"),
      createDecisionOption(row, "revise", "Revise"),
      createDecisionOption(row, "reject", "Reject")
    );
    fieldset.append(decisionOptions);
    if (effective.reviewDecision !== "") {
      fieldset.append(createReviewNoteField(row));
    }
    if (effective.reviewDecision === "revise") {
      fieldset.append(createRevisionFields(row));
    }

    const actions = createElement("div", "candidate-actions");
    const clearButton = createElement(
      "button",
      "button button--text",
      "未判断に戻す"
    );
    clearButton.type = "button";
    clearButton.disabled = effective.reviewDecision === "";
    clearButton.addEventListener("click", () => {
      updateDraft(row, {
        reviewDecision: "",
        reviewNote: "",
        proposedRelationType: row.proposedRelationType,
        proposedExplanation: row.proposedExplanation,
      });
      renderCandidates();
    });
    actions.append(clearButton);
    reviewColumn.append(fieldset, actions);
    contentGrid.append(explanation, reviewColumn);

    card.append(header, hierarchy, department, contentGrid);
    return card;
  }

  function renderCandidates() {
    const filtered = getFilteredRows();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(start, start + PAGE_SIZE);

    elements.loadingState.hidden = true;
    elements.errorState.hidden = true;
    elements.emptyState.hidden = filtered.length > 0;
    elements.candidateList.replaceChildren(
      ...pageRows.map(createCandidateCard)
    );

    const decisionLabel =
      DECISION_LABELS[elements.decisionFilter.value] ?? "すべて";
    elements.candidateHeading.textContent =
      elements.decisionFilter.value === "all"
        ? "すべての候補"
        : `${decisionLabel}の候補`;
    elements.resultCount.textContent =
      filtered.length === 0
        ? "0件"
        : `${filtered.length}件中 ${start + 1}〜${Math.min(
            start + PAGE_SIZE,
            filtered.length
          )}件`;
    elements.pageStatus.textContent = `${state.page} / ${totalPages}ページ`;
    elements.previousPage.disabled = state.page <= 1;
    elements.nextPage.disabled = state.page >= totalPages;
  }

  function renderSaveBar(message) {
    const dirtyCount = state.drafts.size;
    elements.dirtyCount.textContent =
      dirtyCount === 0
        ? "未保存の変更はありません"
        : `${dirtyCount}件の未保存変更があります`;
    elements.saveButton.disabled = dirtyCount === 0 || state.saving;
    if (message) {
      elements.saveGuidance.textContent = message;
      return;
    }
    const summary = calculateEffectiveSummary();
    elements.saveGuidance.textContent =
      summary.pending === 0
        ? "全候補の判断が揃っています。保存後、Codexへ「提出したよ」と伝えてください。"
        : "全件保存後、未判断が0件になったらCodexへ「提出したよ」と伝えてください。";
  }

  function populateCategories() {
    if (!state.snapshot) {
      return;
    }
    const currentValue = elements.categoryFilter.value;
    elements.categoryFilter
      .querySelectorAll("option:not(:first-child)")
      .forEach((option) => {
        option.remove();
      });
    for (const category of state.snapshot.categories) {
      const option = document.createElement("option");
      option.value = category.slug;
      option.textContent = category.name;
      elements.categoryFilter.append(option);
    }
    elements.categoryFilter.value = state.snapshot.categories.some(
      (category) => category.slug === currentValue
    )
      ? currentValue
      : "all";
  }

  function renderAll() {
    populateCategories();
    renderSummary();
    renderCandidates();
    renderSaveBar();
  }

  function formatFetchError(error) {
    return error instanceof Error ? error.message : String(error);
  }

  async function loadReviewData() {
    elements.loadingState.hidden = false;
    elements.errorState.hidden = true;
    try {
      const response = await fetch("/api/review", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`候補の取得に失敗しました（${response.status}）`);
      }
      const snapshot = await response.json();
      if (snapshot.schemaVersion !== "budget-topic-review-site-v1") {
        throw new Error("候補データの形式が一致しません");
      }
      state.snapshot = snapshot;
      state.drafts.clear();
      state.page = 1;
      renderAll();
      setLiveStatus(`${snapshot.summary.total}件の候補を読み込みました`);
    } catch (error) {
      elements.loadingState.hidden = true;
      elements.errorState.hidden = false;
      elements.errorMessage.textContent = formatFetchError(error);
      elements.candidateList.replaceChildren();
    }
  }

  function validateChanges() {
    if (!state.snapshot) {
      return "候補データが読み込まれていません";
    }
    for (const row of state.snapshot.rows) {
      const draft = state.drafts.get(row.rowKey);
      if (!draft) {
        continue;
      }
      if (
        (draft.reviewDecision === "approve" ||
          draft.reviewDecision === "revise") &&
        draft.reviewNote.trim() === ""
      ) {
        return `${row.displayProgramName}: レビュー注記を入力してください`;
      }
      if (
        draft.reviewDecision === "revise" &&
        row.reviewDecision !== "revise" &&
        draft.proposedRelationType === row.proposedRelationType &&
        draft.proposedExplanation === row.proposedExplanation
      ) {
        return `${row.displayProgramName}: Reviseでは関係種別または説明を修正してください`;
      }
    }
    return null;
  }

  function buildSaveRequest() {
    if (!state.snapshot) {
      throw new Error("候補データが読み込まれていません");
    }
    const rowsByKey = new Map(
      state.snapshot.rows.map((row) => [row.rowKey, row])
    );
    const changes = [...state.drafts].map(([rowKey, draft]) => {
      const row = rowsByKey.get(rowKey);
      if (!row) {
        throw new Error(`候補が見つかりません: ${rowKey}`);
      }
      return {
        reviewFile: row.reviewFile,
        budgetProgramIdentityId: row.budgetProgramIdentityId,
        ...draft,
      };
    });
    return { revision: state.snapshot.revision, changes };
  }

  async function saveChanges() {
    const validationError = validateChanges();
    if (validationError) {
      renderSaveBar(validationError);
      setLiveStatus(validationError);
      return;
    }
    state.saving = true;
    renderSaveBar("CSVへ保存しています。");
    try {
      const response = await fetch("/api/review", {
        method: "PUT",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(buildSaveRequest()),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body.error || `保存に失敗しました（${response.status}）`
        );
      }
      state.snapshot = body;
      state.drafts.clear();
      state.saving = false;
      renderAll();
      const message = `${body.summary.total - body.summary.pending}件の判断をCSVへ保存しました`;
      renderSaveBar(
        body.summary.pending === 0
          ? "全候補を保存しました。Codexへ「提出したよ」と伝えてください。"
          : `保存しました。未判断は${body.summary.pending}件です。`
      );
      setLiveStatus(message);
    } catch (error) {
      state.saving = false;
      const message = formatFetchError(error);
      renderSaveBar(message);
      setLiveStatus(message);
    }
  }

  function resetFilters() {
    elements.searchInput.value = "";
    elements.categoryFilter.value = "all";
    elements.decisionFilter.value = "pending";
    elements.evidenceFilter.value = "all";
    elements.sortSelect.value = "source";
    state.page = 1;
    renderCandidates();
  }

  for (const element of [
    elements.categoryFilter,
    elements.decisionFilter,
    elements.evidenceFilter,
    elements.sortSelect,
  ]) {
    element.addEventListener("change", () => {
      state.page = 1;
      renderCandidates();
    });
  }
  elements.searchInput.addEventListener("input", () => {
    state.page = 1;
    renderCandidates();
  });
  elements.resetFilters.addEventListener("click", resetFilters);
  elements.retryLoad.addEventListener("click", loadReviewData);
  elements.saveButton.addEventListener("click", saveChanges);
  elements.previousPage.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderCandidates();
    elements.candidateList.focus();
  });
  elements.nextPage.addEventListener("click", () => {
    state.page += 1;
    renderCandidates();
    elements.candidateList.focus();
  });
  window.addEventListener("beforeunload", (event) => {
    if (state.drafts.size > 0) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  loadReviewData();
})();
