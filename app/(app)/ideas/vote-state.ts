export type VoteActionStatus = "success" | "error" | "auth-required";

export type ConfirmedVoteState = {
  ideaId: string;
  voteCount: number;
  hasCurrentUserVote: boolean;
};

export type VoteActionResult =
  | (ConfirmedVoteState & {
      status: "success";
      message: string;
    })
  | {
      status: Exclude<VoteActionStatus, "success">;
      ideaId?: string;
      message: string;
    };
