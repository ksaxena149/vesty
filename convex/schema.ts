import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Clerk user ID
    id: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
  })
    .index("by_clerk_id", ["id"])
    .index("by_email", ["email"]),

  images: defineTable({
    userId: v.string(),
    type: v.union(v.literal("USER"), v.literal("OUTFIT"), v.literal("RESULT")),
    url: v.string(),
    filename: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
  })
    .index("by_userId", ["userId"])
    .index("by_type", ["type"])
    .index("by_userId_and_type", ["userId", "type"]),

  swaps: defineTable({
    userId: v.string(),
    userImageId: v.id("images"),
    outfitImageId: v.id("images"),
    resultImageId: v.optional(v.id("images")),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    error: v.optional(v.string()),
    processingStartedAt: v.optional(v.number()), // timestamp
    processingCompletedAt: v.optional(v.number()), // timestamp
    createdAt: v.number(), // timestamp
    updatedAt: v.number(), // timestamp
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_userImageId", ["userImageId"])
    .index("by_outfitImageId", ["outfitImageId"])
    .index("by_resultImageId", ["resultImageId"]),
});
