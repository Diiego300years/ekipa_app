"use client";

import { useState } from "react";

import type { IdeaCommentListItem } from "@/lib/supabase/ideas";

import { CommentForm } from "./comment-form";
import type { CreatedIdeaComment } from "./comment-state";

type IdeaCommentsProps = {
  ideaId: string;
  initialComments: IdeaCommentListItem[];
  loginHref: string;
  currentUserDisplayName: string;
};

const fallbackDisplayName = "Użytkownik";

function cleanDisplayName(displayName: string) {
  return displayName.trim() || fallbackDisplayName;
}

export function IdeaComments({
  ideaId,
  initialComments,
  loginHref,
  currentUserDisplayName,
}: IdeaCommentsProps) {
  const [comments, setComments] = useState(initialComments);
  const displayName = cleanDisplayName(currentUserDisplayName);

  function handleCommentCreated(comment: CreatedIdeaComment) {
    setComments((currentComments) => [
      ...currentComments,
      {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        authorName: displayName,
      },
    ]);
  }

  return (
    <div
      className="mt-4 border-t border-slate-100 pt-4"
      data-testid="idea-comments"
    >
      <h3 className="text-sm font-semibold text-slate-900">Komentarze</h3>

      {comments.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {comments.map((comment) => (
            <li
              className="border-l border-slate-200 pl-3 text-sm"
              data-testid="idea-comment"
              key={comment.id}
            >
              <p className="font-semibold text-slate-700">
                {comment.authorName}
              </p>
              <p className="whitespace-pre-wrap break-words leading-6 text-slate-700">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Brak komentarzy.
        </p>
      )}

      <CommentForm
        ideaId={ideaId}
        loginHref={loginHref}
        onCommentCreated={handleCommentCreated}
      />
    </div>
  );
}
