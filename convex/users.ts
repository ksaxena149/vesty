import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create or update user (for Clerk integration)
export const createOrUpdateUser = mutation({
  args: {
    id: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", args.id))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        name: args.name,
        updatedAt: now,
      });
      return existingUser._id;
    } else {
      // Create new user
      const userData: any = {
        id: args.id,
        email: args.email,
        createdAt: now,
        updatedAt: now,
      };
      
      // Only include name if it's not undefined
      if (args.name !== undefined) {
        userData.name = args.name;
      }
      
      return await ctx.db.insert("users", userData);
    }
  },
});

// Get user by Clerk ID
export const getUserById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("id", args.id))
      .first();
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});
