import type { IdeaFieldErrors } from "@/lib/idea-form-validation";

export type EditIdeaActionState = {
  status: "idle" | "error" | "auth-required";
  message: string;
  fieldErrors: IdeaFieldErrors;
};

export const emptyEditIdeaActionState: EditIdeaActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
