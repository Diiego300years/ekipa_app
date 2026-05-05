"use client";

import { useOptimistic, useState } from "react";

import { formatIdeaVoteCount } from "@/lib/idea-formatting";

import { removeVoteForIdeaAction, voteForIdeaAction } from "./actions";
import { VoteButton } from "./vote-button";
import type { ConfirmedVoteState } from "./vote-state";

type VoteControlProps = {
  ideaId: string;
  initialVoteCount: number;
  initialHasCurrentUserVote: boolean;
};

type VoteActionIntent = "vote" | "undo";

type InlineVoteMessage = {
  status: "success" | "error";
  text: string;
};

function getOptimisticVoteState(
  state: ConfirmedVoteState,
  action: VoteActionIntent,
): ConfirmedVoteState {
  if (action === "vote") {
    return {
      ...state,
      voteCount: state.hasCurrentUserVote
        ? state.voteCount
        : state.voteCount + 1,
      hasCurrentUserVote: true,
    };
  }

  return {
    ...state,
    voteCount: state.hasCurrentUserVote
      ? Math.max(0, state.voteCount - 1)
      : state.voteCount,
    hasCurrentUserVote: false,
  };
}

export function VoteControl({
  ideaId,
  initialVoteCount,
  initialHasCurrentUserVote,
}: VoteControlProps) {
  const [confirmedState, setConfirmedState] = useState<ConfirmedVoteState>({
    ideaId,
    voteCount: initialVoteCount,
    hasCurrentUserVote: initialHasCurrentUserVote,
  });
  const [message, setMessage] = useState<InlineVoteMessage | null>(null);
  const [pendingIntent, setPendingIntent] = useState<VoteActionIntent | null>(
    null,
  );
  const [optimisticState, setOptimisticState] = useOptimistic(
    confirmedState,
    getOptimisticVoteState,
  );

  async function handleVoteAction(formData: FormData) {
    const previousState = confirmedState;
    const intent: VoteActionIntent = previousState.hasCurrentUserVote
      ? "undo"
      : "vote";

    setPendingIntent(intent);
    setMessage(null);
    setOptimisticState(intent);

    try {
      const result =
        intent === "vote"
          ? await voteForIdeaAction(formData)
          : await removeVoteForIdeaAction(formData);

      if (result.status === "success") {
        setConfirmedState({
          ideaId: result.ideaId,
          voteCount: result.voteCount,
          hasCurrentUserVote: result.hasCurrentUserVote,
        });
        setMessage({
          status: "success",
          text: result.message,
        });
      } else {
        setConfirmedState(previousState);
        setMessage({
          status: "error",
          text: result.message,
        });
      }
    } catch {
      setConfirmedState(previousState);
      setMessage({
        status: "error",
        text:
          intent === "vote"
            ? "Nie udało się oddać głosu. Spróbuj ponownie."
            : "Nie udało się cofnąć głosu. Spróbuj ponownie.",
      });
    } finally {
      setPendingIntent(null);
    }
  }

  const activeIntent: VoteActionIntent = optimisticState.hasCurrentUserVote
    ? "undo"
    : "vote";
  const buttonIntent = pendingIntent ?? activeIntent;
  const buttonLabel =
    activeIntent === "undo" ? "Cofnij głos" : "Głosuj";
  const pendingLabel =
    buttonIntent === "undo" ? "Cofanie głosu..." : "Głosowanie...";
  const variant = buttonIntent === "undo" ? "secondary" : "primary";

  return (
    <>
      <p
        className="text-sm font-semibold text-slate-900"
        data-testid="idea-vote-count"
      >
        {formatIdeaVoteCount(optimisticState.voteCount)}
      </p>

      <div className="text-right">
        <form
          action={handleVoteAction}
          data-testid={
            optimisticState.hasCurrentUserVote
              ? "idea-voted-state"
              : "idea-vote-action"
          }
        >
          <input name="ideaId" type="hidden" value={ideaId} />
          <VoteButton
            label={buttonLabel}
            pendingLabel={pendingLabel}
            variant={variant}
          />
        </form>

        {message ? (
          <p
            aria-live="polite"
            className={`mt-2 max-w-52 text-xs font-medium leading-5 ${
              message.status === "success" ? "text-teal-800" : "text-red-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </>
  );
}
