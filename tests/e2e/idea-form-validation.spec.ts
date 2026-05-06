import { expect, test } from "@playwright/test";

import { validateIdeaFormData } from "../../lib/idea-form-validation";

function createIdeaFormData(values: Record<string, string>) {
  const formData = new FormData();

  for (const [field, value] of Object.entries(values)) {
    formData.set(field, value);
  }

  return formData;
}

test.describe("shared idea form validation", () => {
  test("keeps edit validation aligned with add validation", () => {
    const result = validateIdeaFormData(
      createIdeaFormData({
        title: "   ",
        description: "O".repeat(1001),
        location: "M".repeat(161),
        price: "-1",
      }),
    );

    expect(result.status).toBe("invalid");

    if (result.status === "invalid") {
      expect(result.fieldErrors).toEqual({
        title: "Podaj tytuł pomysłu.",
        description: "Opis może mieć maksymalnie 1000 znaków.",
        location: "Miejsce może mieć maksymalnie 160 znaków.",
        price: "Cena nie może być ujemna.",
      });
    }
  });

  test("accepts Polish-friendly decimal price input", () => {
    const result = validateIdeaFormData(
      createIdeaFormData({
        title: "Pomysł z ceną",
        description: "",
        location: "",
        price: "25,50 zł",
      }),
    );

    expect(result.status).toBe("valid");

    if (result.status === "valid") {
      expect(result.values).toMatchObject({
        title: "Pomysł z ceną",
        description: null,
        location: null,
        price: 25.5,
      });
    }
  });
});
