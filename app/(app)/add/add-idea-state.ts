export type AddIdeaFieldErrors = {
  title?: string;
  description?: string;
  location?: string;
  price?: string;
};

export type AddIdeaActionState = {
  status: "idle" | "error" | "auth-required";
  message: string;
  fieldErrors: AddIdeaFieldErrors;
};

export const emptyAddIdeaActionState: AddIdeaActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
