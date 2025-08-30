import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create swap
export const createSwap = mutation({
  args: {
    userId: v.string(),
    userImageId: v.id("images"),
    outfitImageId: v.id("images"),
    resultImageId: v.optional(v.id("images")),
    status: v.optional(
      v.union(
        v.literal("PENDING"),
        v.literal("PROCESSING"),
        v.literal("COMPLETED"),
        v.literal("FAILED")
      )
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("swaps", {
      ...args,
      status: args.status || "PENDING",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update swap status
export const updateSwapStatus = mutation({
  args: {
    id: v.id("swaps"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    error: v.optional(v.string()),
    resultImageId: v.optional(v.id("images")),
    processingStartedAt: v.optional(v.number()),
    processingCompletedAt: v.optional(v.number()),
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

// Get swaps by user
export const getSwapsByUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const swaps = await ctx.db
      .query("swaps")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Populate related images
    const swapsWithImages = await Promise.all(
      swaps.map(async (swap) => {
        const [userImage, outfitImage, resultImage] = await Promise.all([
          ctx.db.get(swap.userImageId),
          ctx.db.get(swap.outfitImageId),
          swap.resultImageId ? ctx.db.get(swap.resultImageId) : null,
        ]);

        return {
          ...swap,
          userImage,
          outfitImage,
          resultImage,
        };
      })
    );

    return swapsWithImages;
  },
});

// Get swap by ID with related images
export const getSwapById = query({
  args: { id: v.id("swaps") },
  handler: async (ctx, args) => {
    const swap = await ctx.db.get(args.id);
    if (!swap) return null;

    const [userImage, outfitImage, resultImage] = await Promise.all([
      ctx.db.get(swap.userImageId),
      ctx.db.get(swap.outfitImageId),
      swap.resultImageId ? ctx.db.get(swap.resultImageId) : null,
    ]);

    return {
      ...swap,
      userImage,
      outfitImage,
      resultImage,
    };
  },
});

// Get recent swaps (for admin/dashboard)
export const getRecentSwaps = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    return await ctx.db
      .query("swaps")
      .order("desc")
      .take(limit);
  },
});
