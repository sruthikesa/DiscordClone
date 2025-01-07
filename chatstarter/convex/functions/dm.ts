import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

// create a list function that will fetch all the dms that youre a part of
export const list = authenticatedQuery({
  handler: async (ctx) => {
    const directMessages = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_user", (q) => q.eq("user", ctx.user._id))
      .collect();
    return await Promise.all(
      directMessages.map((dm) => getDirectMessage(ctx, dm.directMessage))
    );
  },
});

// get function: given the dm id, we return the dm and the name of the user who is in the dm
export const get = authenticatedQuery({
  //   input args
  args: {
    id: v.id("directMessages"),
  },
  //   look up the dm by the id and return it only if youre a member of that dm
  handler: async (ctx, { id }) => {
    // first verify if you are a member of that dm
    const member = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_direct_message_user", (q) =>
        q.eq("directMessage", id).eq("user", ctx.user._id)
      )
      .first();
    if (!member) {
      throw new Error("You are not a member of this direct message.");
    }
    return await getDirectMessage(ctx, id);
  },
});

// create a new dm, mutation that will take a username, handler:look up the user by their username, find their dm thread if it exists
// create one if it doesnt exist
export const create = authenticatedMutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
    if (!user) {
      throw new Error("User does not exist.");
    }
    // search if there is a thread with the current user and with the other user we searched with the username adn see if theres an overlap between the two and return the id of that dm
    const directMessagesForCurrentUser = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_user", (q) => q.eq("user", ctx.user._id))
      .collect();
    const directMessagesForOtherUser = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_user", (q) => q.eq("user", user._id))
      .collect();
    // find the dm where the two are there
    const directMessage = directMessagesForCurrentUser.find((dm) =>
      directMessagesForOtherUser.find(
        (dm2) => dm.directMessage === dm2.directMessage
      )
    );
    if (directMessage) {
      return directMessage.directMessage;
    }

    // otherwise create a new dm
    const newDirectMessage = await ctx.db.insert("directMessages", {});
    await Promise.all([
      ctx.db.insert("directMessageMembers", {
        user: ctx.user._id,
        directMessage: newDirectMessage,
      }),
      ctx.db.insert("directMessageMembers", {
        user: user._id,
        directMessage: newDirectMessage,
      }),
    ]);
    return newDirectMessage;
  },
});

const getDirectMessage = async (
  ctx: QueryCtx & { user: Doc<"users"> },
  id: Id<"directMessages">
) => {
  const dm = await ctx.db.get(id);
  if (!dm) {
    throw new Error("Direct message does not exist.");
  }
  // fetch other members of this dm (For now since there is only 1 member- changed it to otherMember
  // fetch all except the current user (filter is used)
  const otherMember = await ctx.db
    .query("directMessageMembers")
    .withIndex("by_direct_message", (q) => q.eq("directMessage", id))
    .filter((q) => q.neq(q.field("user"), ctx.user._id)) //before collecting/select first one, we have to filter out the id of the current user
    .first();
  if (!otherMember) {
    throw new Error("Direct message has no other members.");
  }
  const user = await ctx.db.get(otherMember.user);
  if (!user) {
    throw new Error("Other member does not exist.");
  }
  return {
    ...dm,
    user,
  };
};
