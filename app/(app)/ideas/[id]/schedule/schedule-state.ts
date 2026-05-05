export type ScheduleIdeaFieldErrors = {
  ideaId?: string;
  startAt?: string;
  endAt?: string;
  note?: string;
};

export type ScheduleIdeaActionState = {
  status: "idle" | "error" | "auth-required";
  message: string;
  fieldErrors: ScheduleIdeaFieldErrors;
};

export const emptyScheduleIdeaActionState: ScheduleIdeaActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};
