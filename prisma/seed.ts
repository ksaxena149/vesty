const { PrismaClient } = require("../src/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Clean up existing data (development only)
  await prisma.swap.deleteMany();
  await prisma.image.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  console.log("👤 Creating test users...");
  
  const testUser1 = await prisma.user.create({
    data: {
      id: "user_test123", // Mock Clerk ID
      email: "john@example.com",
      name: "John Doe",
    },
  });

  const testUser2 = await prisma.user.create({
    data: {
      id: "user_test456",
      email: "jane@example.com", 
      name: "Jane Smith",
    },
  });

  // Create test images
  console.log("🖼️  Creating test images...");
  
  // User images
  const userImage1 = await prisma.image.create({
    data: {
      userId: testUser1.id,
      type: "USER",
      url: "https://example.com/user1.jpg",
    },
  });

  const userImage2 = await prisma.image.create({
    data: {
      userId: testUser2.id,
      type: "USER", 
      url: "https://example.com/user2.jpg",
    },
  });

  // Outfit images
  const outfitImage1 = await prisma.image.create({
    data: {
      userId: testUser1.id,
      type: "OUTFIT",
      url: "https://example.com/dress1.jpg",
    },
  });

  const outfitImage2 = await prisma.image.create({
    data: {
      userId: testUser1.id,
      type: "OUTFIT",
      url: "https://example.com/shirt1.jpg", 
    },
  });

  const outfitImage3 = await prisma.image.create({
    data: {
      userId: testUser2.id,
      type: "OUTFIT",
      url: "https://example.com/jacket1.jpg",
    },
  });

  // Result images  
  const resultImage1 = await prisma.image.create({
    data: {
      userId: testUser1.id,
      type: "RESULT",
      url: "https://example.com/result1.jpg",
    },
  });

  // Create test swaps
  console.log("🔄 Creating test swaps...");

  const completedSwap = await prisma.swap.create({
    data: {
      userId: testUser1.id,
      userImageId: userImage1.id,
      outfitImageId: outfitImage1.id,
      resultImageId: resultImage1.id,
      status: "COMPLETED",
    },
  });

  const pendingSwap = await prisma.swap.create({
    data: {
      userId: testUser1.id,
      userImageId: userImage1.id,
      outfitImageId: outfitImage2.id,
      status: "PENDING",
    },
  });

  const failedSwap = await prisma.swap.create({
    data: {
      userId: testUser2.id,
      userImageId: userImage2.id,
      outfitImageId: outfitImage3.id,
      status: "FAILED",
    },
  });

  console.log("✅ Database seeded successfully!");
  console.log(`Created:`);
  console.log(`  - ${2} users`);
  console.log(`  - ${5} images`);
  console.log(`  - ${3} swaps`);

  // Display created data
  console.log("\n📊 Seeded data summary:");
  console.log("Users:", { testUser1: testUser1.email, testUser2: testUser2.email });
  console.log("Swaps:", { 
    completed: completedSwap.id,
    pending: pendingSwap.id, 
    failed: failedSwap.id
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });