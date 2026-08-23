"use client";

import { useEffect } from "react";

interface AdminBillPublicationKindControllerProps {
  budgetMajorCategory: string;
  defaultMajorCategory: string;
}

function findOption(select: HTMLSelectElement, value: string) {
  return Array.from(select.options).find((option) => option.value === value);
}

export function AdminBillPublicationKindController({
  budgetMajorCategory,
  defaultMajorCategory,
}: AdminBillPublicationKindControllerProps) {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(
      "[data-admin-bill-form]"
    );
    if (!form) return;

    const publicationCategorySelect = form.querySelector<HTMLSelectElement>(
      'select[name="publication_category"]'
    );
    const majorCategorySelect = form.querySelector<HTMLSelectElement>(
      'select[name="major_category"]'
    );
    if (!publicationCategorySelect || !majorCategorySelect) return;

    const categoryHiddenFieldsets = Array.from(
      form.querySelectorAll<HTMLFieldSetElement>("[data-admin-bill-hidden-for]")
    );

    const ensureBudgetMajorCategoryOption = () => {
      if (findOption(majorCategorySelect, budgetMajorCategory)) return;

      const option = new Option(budgetMajorCategory, budgetMajorCategory);
      option.dataset.adminBudgetMajorCategory = "true";
      majorCategorySelect.append(option);
    };

    const removeBudgetMajorCategoryOption = () => {
      const option = findOption(majorCategorySelect, budgetMajorCategory);
      if (!option) return;

      if (majorCategorySelect.value === budgetMajorCategory) {
        majorCategorySelect.value = defaultMajorCategory;
      }
      option.remove();
    };

    const syncPublicationCategory = () => {
      const isBudget = publicationCategorySelect.value === "budget";

      for (const fieldset of categoryHiddenFieldsets) {
        const hiddenFor = fieldset.dataset.adminBillHiddenFor?.split(" ") ?? [];
        const isHidden = hiddenFor.includes(publicationCategorySelect.value);
        fieldset.disabled = isHidden;
        fieldset.style.display = isHidden ? "none" : "contents";
      }

      if (isBudget) {
        ensureBudgetMajorCategoryOption();
      } else {
        removeBudgetMajorCategoryOption();
      }
    };

    syncPublicationCategory();
    publicationCategorySelect.addEventListener(
      "change",
      syncPublicationCategory
    );

    return () => {
      publicationCategorySelect.removeEventListener(
        "change",
        syncPublicationCategory
      );
    };
  }, [budgetMajorCategory, defaultMajorCategory]);

  return null;
}
