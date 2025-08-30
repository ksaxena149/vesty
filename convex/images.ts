import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create image
export const createImage = mutation({
  args: {
    userId: v.string(),
    type: v.union(v.literal("USER"), v.literal("OUTFIT"), v.literal("RESULT")),
    url: v.string(),
    filename: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("images", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get images by user
export const getImagesByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("images")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get images by user and type
export const getImagesByUserAndType = query({
  args: {
    userId: v.string(),
    type: v.union(v.literal("USER"), v.literal("OUTFIT"), v.literal("RESULT")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("images")
      .withIndex("by_userId_and_type", (q) =>
        q.eq("userId", args.userId).eq("type", args.type)
      )
      .collect();
  },
});

// Get image by ID
export const getImageById = query({
  args: { id: v.id("images") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update image
export const updateImage = mutation({
  args: {
    id: v.id("images"),
    url: v.optional(v.string()),
    filename: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateData } = args;
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );
    
    await ctx.db.patch(id, {
      ...filteredUpdateData,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(id);
  },
});
