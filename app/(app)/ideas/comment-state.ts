export type CommentFieldErrors = {
  body?: string;
};

export type CommentActionState = {
  status: "idle" | "error" | "auth-required";
  message: string;
  fieldErrors: CommentFieldErrors;
};

export const emptyCommentActionState: CommentActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
