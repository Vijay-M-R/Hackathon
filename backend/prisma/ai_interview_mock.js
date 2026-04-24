import { prisma } from "../src/config/db.js";
import crypto from "crypto";

async function main() {
  console.log("🤖 Seeding AI Interview Mock Data (Safe Mode)...");

  // 1. Ensure at least one student exists to attach interviews to
  let student = await prisma.user.findFirst({
    where: { role: "STUDENT" }
  });

  if (!student) {
    console.log("👨‍🎓 No student found, creating a default mock student...");
    student = await prisma.user.create({
      data: {
        email: "mock.student@placeready.com",
        password: "password123", // Non-hashed for simplicity in mock, though hashed is better
        role: "STUDENT",
        fullName: "Aarav Sharma",
        name: "Aarav",
        department: "Computer Science",
      }
    });
    
    await prisma.studentProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: student.id,
        cgpa: 8.5,
        readinessScore: 78,
        branch: "Computer Science",
        semester: 7
      }
    });
  }

  console.log(`📝 Seeding interviews for: ${student.email}`);

  // 2. Create a COMPLETED AI Interview with deep analysis
  const interview = await prisma.mockInterview.create({
    data: {
      title: "Google Technical Mock - SDE 1",
      type: "AI",
      mode: "TECHNICAL",
      status: "COMPLETED",
      studentId: student.id,
      overallScore: 82,
      feedback: "Excellent command over Data Structures. You should work on your system design fundamentals, especially horizontal scaling concepts. Communication was clear and concise.",
      analysis: {
        technical: 85,
        communication: 78,
        confidence: 88,
        problemSolving: 80
      },
      messages: {
        create: [
          { senderRole: "AI", senderName: "AI Interviewer", text: "Hello, I'm your AI interviewer. Let's start with a problem on arrays. How would you find the maximum subarray sum?" },
          { senderRole: "STUDENT", senderName: student.name || "Student", text: "I would use Kadane's algorithm, which iterates through the array and keeps track of the maximum sum ending at the current position." },
          { senderRole: "AI", senderName: "AI Interviewer", text: "That's correct. What is the time complexity of that approach?" },
          { senderRole: "STUDENT", senderName: student.name || "Student", text: "It is O(n) as we only traverse the array once." }
        ]
      }
    }
  });

  // 3. Add a notification for this interview
  await prisma.notification.create({
    data: {
      userId: student.id,
      title: "Deep Analysis Ready! 🚀",
      message: `Your interview report for '${interview.title}' is ready to view.`,
      type: "SUCCESS"
    }
  });

  // 4. Create a SCHEDULED interview for the future
  await prisma.mockInterview.create({
    data: {
      title: "Amazon SDE Behavioral Mock",
      type: "AI",
      mode: "BEHAVIORAL",
      status: "SCHEDULED",
      studentId: student.id,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
    }
  });

  console.log("✅ AI Interview Mock Data seeded successfully!");
  console.log("👉 You can now see the 'Intelligence Report' for the completed interview in the student dashboard.");
}

main()
  .catch((e) => {
    console.error("❌ Seed Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
