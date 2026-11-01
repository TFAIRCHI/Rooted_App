# Traceability Matrix

| Requirement | Research | Build area | Acceptance evidence |
|---|---|---|---|
| Assess login image | `LOGIN_SECURITY_RESEARCH.md` | Rooted login screen | visual/browser review |
| Four dummy logins | `DUMMY_LOGINS.md` | development seed/auth fixture | isolated auth tests |
| Correct post-login routing | `MASTER_BUILD_PROMPT.md` | session/membership router | role routing tests |
| Admin adds members/contributors/admins | `CHANGE_REQUEST.md` | Settings People & access | authorization/invitation tests |
| No client role escalation | `LOGIN_SECURITY_RESEARCH.md` | backend capability checks | tampering tests |
| Secure lifecycle | `LOGIN_SECURITY_RESEARCH.md` | sessions, invitations, audit | security regression tests |
| Accessible responsive screen | image assessment | login UI | axe + keyboard + mobile test |
