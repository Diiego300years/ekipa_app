export type AuthFieldErrors = {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export type AuthActionState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors: AuthFieldErrors;
};

export const emptyAuthActionState: AuthActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
