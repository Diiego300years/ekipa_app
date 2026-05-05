export type CommentFieldErrors = {
  body?: string;
};

export type CreatedIdeaComment = {
  id: string;
  ideaId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CommentActionState = {
  status: "idle" | "success" | "error" | "auth-required";
  message: string;
  fieldErrors: CommentFieldErrors;
  comment?: CreatedIdeaComment;
};

export const emptyCommentActionState: CommentActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
