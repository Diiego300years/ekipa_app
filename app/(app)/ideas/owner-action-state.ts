export type OwnerIdeaActionState = {
  status: "idle" | "error" | "auth-required";
  message: string;
};

export const emptyOwnerIdeaActionState: OwnerIdeaActionState = {
  status: "idle",
  message: "",
};
