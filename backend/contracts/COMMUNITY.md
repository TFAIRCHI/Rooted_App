# Published-study community contracts

All paths below start `/v1/churches/:churchId`. Require authenticated active membership. A publication must still be the content's live pointer; drafts and withdrawn/superseded publications cannot acquire new engagement through these endpoints. Mutations require CSRF and idempotency headers.

- `GET /studies/:id/community` →`{discussionsEnabled,appealContact,reactions:{thankful,encouraged,praying},myReaction,comments}`. Comments are `{id,publicationId,authorId,body,status,version,etag,createdAt,updatedAt}`. Approved comments and removal tombstones are visible; pending comments are visible only to their author. Report reasons and reporters never appear here. Discussions default off.
- `PUT /studies/:id/my-reaction` `{type:'thankful'|'encouraged'|'praying'|null}` replaces/removes the current member's reaction. No negative voting.
- `POST /studies/:id/discussion` `{body}` →201 pending comment. Posting is bounded to ten comments per ten minutes and requires discussion enabled and no participation restriction.
- `POST /discussion/:id/revisions` `{body}` plus the exact comment `If-Match` →201 pending replacement; immutable discussion history is retained under the reviewed privacy policy. Only the author may edit. Editing returns the comment to review.
- `POST /studies/:id/reports` `{commentId,reason}` →201 `{id,status:'pending'}`. Target must belong to that publication and be visible to the reporter. Reports are bounded and private.
- `GET /my-reports` →`{items:[{id,commentId,reason,status,createdAt}]}` for the requesting member only.
- `GET /moderation` requires `moderation:manage` →`{items:commentDTO[],reports:[{id,commentId,reporterId,reason,status,createdAt}],reactions:[{id,publicationId,userId,type}],restrictions:[{userId,until,reason}]}`.
- `POST /moderation/:id/decisions` `{decision:'approve'|'hide',reason}` plus the exact reviewed comment `If-Match` →201 updated comment and ETag. Missing version is428; an author edit after the moderator loaded the page is412 and requires re-reading. No stale decision may approve unseen text. Decisions are immutable, reasoned and audited. Hiding replaces the public body with a removal tombstone and resolves pending reports.
- `POST /moderation/reactions/:id/hide` `{reason}` requires moderation capability, removes a reaction and records an audit event.
- `POST /moderation/restrictions` `{userId,until:ISO,reason}` requires moderation capability. Expiry must be within one year. A past expiry lifts the restriction; changes are audited. Moderators cannot change their own restrictions. Restricted members can still read, report, and remove their own reaction, but cannot add reactions/comments or edit comments.

`POST /settings` accepts optional `appealContact:string|null`, exposed in the community response. Church staff must provide their actual appeal contact; the server does not invent one. Privacy erasure produces a distinct removal tombstone without exposing retained historical text.
