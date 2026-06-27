import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  WorldDomain,
  createInitialChatState,
  toChatEventId,
  toChatId,
  toMessageId,
  toWorldId,
  transitionAll
} from "../src/index.js";
import type { ChatKernelEvent } from "../src/index.js";

describe("ChatKernel determinism", () => {
  it("sorts structured events by timestamp and id before sequential reduction", () => {
    const domain = WorldDomain.create({
      reality: {
        ownerActorId: "user",
        assistantActorId: "ovone"
      }
    });
    const initial = createInitialChatState(domain.getWorldState(toWorldId("reality")));
    const chatId = toChatId("chat:reality");

    const events: readonly ChatKernelEvent[] = [
      {
        id: toChatEventId("event:c-message"),
        type: "message.submitted",
        worldId: initial.world.id,
        timestamp: 2,
        payload: {
          chatId,
          messageId: toMessageId("message:c"),
          authorActorId: "user",
          text: "second by id",
          createdAt: 2
        }
      },
      {
        id: toChatEventId("event:a-start"),
        type: "chat.started",
        worldId: initial.world.id,
        timestamp: 1,
        payload: {
          chatId,
          title: "Reality"
        }
      },
      {
        id: toChatEventId("event:b-message"),
        type: "message.submitted",
        worldId: initial.world.id,
        timestamp: 2,
        payload: {
          chatId,
          messageId: toMessageId("message:b"),
          authorActorId: "user",
          text: "first by id",
          createdAt: 2
        }
      }
    ];

    const first = transitionAll(initial, events);
    const second = transitionAll(initial, [...events].reverse());
    const messages = first.chat.chats.get(chatId)?.messages ?? [];

    assert.deepEqual(messages.map((message) => message.text), ["first by id", "second by id"]);
    assert.deepEqual(
      [...second.chat.chats.get(chatId)!.messages].map((message) => message.text),
      ["first by id", "second by id"]
    );
  });
});
