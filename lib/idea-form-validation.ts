import { ideaLimits } from "@/lib/idea-limits";

export type IdeaFieldErrors = {
  title?: string;
  description?: string;
  location?: string;
  price?: string;
};

export type ValidatedIdeaInput = {
  title: string;
  description: string | null;
  location: string | null;
  price: number | null;
};

export type IdeaFormValidationResult =
  | {
      status: "valid";
      values: ValidatedIdeaInput;
    }
  | {
      status: "invalid";
      fieldErrors: IdeaFieldErrors;
    };

type ParsedPrice =
  | {
      value: number | null;
    }
  | {
      error: string;
    };

const maxDatabasePrice = 99_999_999.99;

function readFormText(formData: FormData, field: string) {
  const value = formData.get(field);

  return typeof value === "string" ? value.trim() : "";
}

function parsePriceInput(input: string): ParsedPrice {
  const compactPrice = input.toLowerCase().replace(/\s/g, "");

  if (!compactPrice) {
    return {
      value: null,
    };
  }

  const withoutCurrency = compactPrice.endsWith("zł")
    ? compactPrice.slice(0, -2)
    : compactPrice;
  const normalizedPrice = withoutCurrency.replace(",", ".");

  if (normalizedPrice.startsWith("-")) {
    return {
      error: "Cena nie może być ujemna.",
    };
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedPrice)) {
    return {
      error: "Wpisz poprawną cenę.",
    };
  }

  const price = Number(normalizedPrice);

  if (!Number.isFinite(price)) {
    return {
      error: "Wpisz poprawną cenę.",
    };
  }

  if (price > maxDatabasePrice) {
    return {
      error: "Cena jest za wysoka.",
    };
  }

  return {
    value: Math.round(price * 100) / 100,
  };
}

function hasFieldErrors(fieldErrors: IdeaFieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

export function validateIdeaFormData(
  formData: FormData,
): IdeaFormValidationResult {
  const title = readFormText(formData, "title");
  const description = readFormText(formData, "description");
  const location = readFormText(formData, "location");
  const priceInput = readFormText(formData, "price");
  const fieldErrors: IdeaFieldErrors = {};

  if (!title) {
    fieldErrors.title = "Podaj tytuł pomysłu.";
  } else if (title.length > ideaLimits.title) {
    fieldErrors.title = `Tytuł może mieć maksymalnie ${ideaLimits.title} znaków.`;
  }

  if (description.length > ideaLimits.description) {
    fieldErrors.description = `Opis może mieć maksymalnie ${ideaLimits.description} znaków.`;
  }

  if (location.length > ideaLimits.location) {
    fieldErrors.location = `Miejsce może mieć maksymalnie ${ideaLimits.location} znaków.`;
  }

  const parsedPrice = parsePriceInput(priceInput);

  if ("error" in parsedPrice) {
    fieldErrors.price = parsedPrice.error;
  }

  if (hasFieldErrors(fieldErrors)) {
    return {
      status: "invalid",
      fieldErrors,
    };
  }

  return {
    status: "valid",
    values: {
      title,
      description: description || null,
      location: location || null,
      price: "value" in parsedPrice ? parsedPrice.value : null,
    },
  };
}

export function formatIdeaPriceForInput(price: number | null) {
  if (price === null) {
    return "";
  }

  return price.toLocaleString("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
