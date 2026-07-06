# Trial MVP Scope Lock

Trial MVP principle: build a usable app skeleton with stable product architecture. Do not build a toy demo. Do not overbuild future systems before the core chat experience works.

## Must Be Usable

1. User can enter ovOne with a local trial session.
2. User can switch worlds.
3. Reality world exists and is locked.
4. User can create a custom world.
5. User can add AI contacts to a world from linked/available providers.
6. User can open private chats.
7. User can create group chats.
8. User can send messages.
9. AI can return real responses through one provider bridge.
10. World isolation is preserved.
11. Private chat and group chat are both usable.
12. Minimal world-scoped memory exists.
13. Main UI flow is usable enough for external trial.

## Future / Scaffold

1. Real file upload.
2. File parsing/indexing.
3. File retrieval/search.
4. AI reading group files.
5. Advanced memory pool.
6. Full account system.
7. Subscription/payment.
8. App Store / production permission hardening.
9. Multi-provider production-grade routing.
10. Full admin/analytics.

## Boundaries

1. Reality world cannot be deleted.
2. Reality worldview cannot be edited.
3. Custom worlds are isolated.
4. Contacts/chats/memory are world-scoped.
5. Group rules affect only that group.
6. Group files affect only that group in future.
7. Delete Friend does not disconnect global AI link.
8. Global disconnect remains separate.
9. AI provider settings remain global.
10. Memory must not cross worlds by default.

## Next Implementation Order

1. v0.13 AI Provider Bridge: added as a safe bridge, not connected to chat sending yet.
2. v0.14 Real Chat Runtime
3. v0.15 Minimal World Memory
4. v0.16 Local Trial Session
5. v0.17 Trial UI Pass
