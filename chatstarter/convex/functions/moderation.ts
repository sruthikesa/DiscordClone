import Groq from "groq-sdk";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const run = internalAction({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    const message = await ctx.runQuery(
      internal.functions.moderation.getMessage,
      {
        id,
      }
    );
    if (!message) return;
    const result = await groq.chat.completions.create({
      model: "llama-guard-3-8b",
      messages: [
        {
          role: "user",
          content: message.content,
        },
      ],
    });
    const value = result.choices[0].message.content;
    console.log(value);

    if (value?.startsWith("unsafe")) {
      await ctx.runMutation(internal.functions.moderation.deleteMessage, {
        id,
        reason: value.replace("unsafe", "").trim(),
      });
    }
  },
});

const reasons = {
  S1: "Violent Crimes",
  S2: "Non-Violent Crimes",
  S3: "Sex-Related Crimes",
  S4: "Child Sexual Exploitation",
  S5: "Defamation",
  S6: "Specialized Advice",
  S7: "Privacy",
  S8: "Intellectual Property",
  S9: "Indiscriminate Weapons",
  S10: "Hate",
  S11: "Suicide & Self-Harm",
  S12: "Sexual Content",
  S13: "Elections",
  S14: "Code Interpreter Abuse",
};

export const deleteMessage = internalMutation({
  args: {
    id: v.id("messages"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { id, reason }) => {
    return await ctx.db.patch(id, {
      deleted: true,
      deletedReason: reason
        ? reasons[
            reason as
              | "S1"
              | "S2"
              | "S3"
              | "S4"
              | "S5"
              | "S6"
              | "S7"
              | "S8"
              | "S9"
              | "S10"
              | "S11"
              | "S12"
              | "S13"
              | "S14"
          ]
        : undefined,
    });
  },
});

export const getMessage = internalQuery({
  args: { id: v.id("messages") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
