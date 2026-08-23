// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminBillPublicationKindController } from "./admin-bill-publication-kind-controller";

function TestForm() {
  return (
    <form data-admin-bill-form="">
      <select
        aria-label="公開種別"
        name="publication_category"
        defaultValue="report"
      >
        <option value="report">報告事項</option>
        <option value="general_question">一般質問</option>
        <option value="budget">予算</option>
      </select>
      <select aria-label="大分類" name="major_category" defaultValue="教育🏫">
        <option value="教育🏫">教育🏫</option>
      </select>
      <fieldset data-admin-bill-hidden-for="budget general_question">
        <input aria-label="通常案件だけの項目" />
      </fieldset>
      <fieldset data-admin-bill-hidden-for="general_question">
        <input aria-label="hard本文" />
      </fieldset>
      <AdminBillPublicationKindController
        budgetMajorCategory="予算全体"
        defaultMajorCategory="教育🏫"
      />
    </form>
  );
}

describe("AdminBillPublicationKindController", () => {
  it("一般質問では指定した項目とhard本文を非表示にする", () => {
    render(<TestForm />);

    fireEvent.change(screen.getByLabelText("公開種別"), {
      target: { value: "general_question" },
    });

    const normalOnlyFieldset = screen
      .getByLabelText("通常案件だけの項目")
      .closest("fieldset");
    const hardContentFieldset = screen
      .getByLabelText("hard本文")
      .closest("fieldset");

    expect(normalOnlyFieldset?.disabled).toBe(true);
    expect(normalOnlyFieldset?.style.display).toBe("none");
    expect(hardContentFieldset?.disabled).toBe(true);
    expect(hardContentFieldset?.style.display).toBe("none");
  });

  it("報告事項へ戻すと非表示項目を再表示する", () => {
    render(<TestForm />);
    const publicationCategory = screen.getByLabelText("公開種別");

    fireEvent.change(publicationCategory, {
      target: { value: "general_question" },
    });
    fireEvent.change(publicationCategory, { target: { value: "report" } });

    const normalOnlyFieldset = screen
      .getByLabelText("通常案件だけの項目")
      .closest("fieldset");
    const hardContentFieldset = screen
      .getByLabelText("hard本文")
      .closest("fieldset");

    expect(normalOnlyFieldset?.disabled).toBe(false);
    expect(normalOnlyFieldset?.style.display).toBe("contents");
    expect(hardContentFieldset?.disabled).toBe(false);
    expect(hardContentFieldset?.style.display).toBe("contents");
  });
});
