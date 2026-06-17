---
name: Object-storage upload ACL
description: Why uploaded-object serving authorization must bind the object namespace to the uploading actor, not just trust a DB row's objectPath.
---

# Object-storage upload ACL (meeting recordings)

The object-serving route authorizes a private object by looking up a
user-created row (a `meeting_recordings` row) whose `objectPath` matches, then
checking the actor's access to that row's project. The DB row is the ACL.

**Rule:** an uploaded object's path MUST be bound to the uploading actor at mint
time (`uploads/<userId>/<uuid>`), and the attach handler MUST reject any
`objectPath` outside the caller's own namespace (exact prefix
`/objects/uploads/<actor.userId>/` + a bare-UUID tail, no slashes => no
traversal). Object existence is still gated by storage `exists()`.

**Why:** the ACL row is user-created. If attach accepts any path starting with
`/objects/`, a user with write access to their OWN project can insert a row
pointing at ANOTHER tenant's private object, then read it through the serving
route (the route authorizes against the attacker's project via the forged row).
Binding the namespace to the actor at mint AND re-checking it at attach means a
row can only ever reference objects that same actor uploaded, so the forged-path
read is impossible even if a victim's object path leaks.

**How to apply:** any new "presign upload URL -> persist objectPath -> serve by
DB-backed ACL" flow must do the same two-sided binding. Never authorize an
object purely because a DB row references its path; the path is attacker-supplied
at attach time. The generic `uploads/<uuid>` template (no owner segment) is the
unsafe default to avoid. Orphan upload-URL minting (no project binding) is a
resource-consumption concern only, acceptable here because registration is closed
and the path is per-user namespaced.
