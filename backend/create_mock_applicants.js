import { prisma } from "./src/config/db.js";

async function main() {
  // 1. Get some students
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: { StudentProfile: true }
  });

  if (students.length === 0) {
    console.log("No students found. Please register some students first.");
    return;
  }

  // 2. Get the mock drives
  const drives = await prisma.placementDrive.findMany({
    where: { company: { name: "Google India" } }
  });

  if (drives.length === 0) {
    console.log("No Google India drives found. Run create_mock_data.js first.");
    return;
  }

  console.log(`Connecting ${students.length} students to ${drives.length} drives...`);

  for (const drive of drives) {
    for (const student of students) {
      // Connect student to drive
      await prisma.placementDrive.update({
        where: { id: drive.id },
        data: {
          students: {
            connect: { id: student.id }
          }
        }
      });

      // Ensure student has a profile with some mock data
      await prisma.studentProfile.upsert({
        where: { userId: student.id },
        update: {
          readinessScore: 75 + Math.random() * 20,
          cgpa: 8.0 + Math.random() * 1.5,
          placementStatus: "APPLIED",
          aiFeedback: "Excellent coding skills, focus on system design and communication."
        },
        create: {
          userId: student.id,
          id: student.usn || `MOCK-${student.id.slice(0, 4)}`,
          readinessScore: 82,
          cgpa: 8.5,
          branch: "Computer Science",
          semester: 7,
          placementStatus: "APPLIED",
          aiFeedback: "Strong analytical thinking. Recommended to practice more mock interviews."
        }
      });
      
      // Add some mock assessment attempts for the charts
      const assessment = await prisma.assessment.findFirst();
      if (assessment) {
        await prisma.assessmentAttempt.create({
          data: {
            userId: student.id,
            assessmentId: assessment.id,
            score: 85,
            correctCount: 42,
            totalCount: 50,
            timeTaken: 1200,
            focusLossCount: 1,
            answers: { mock: true },
            questionsSnapshot: { mock: true }
          }
        });
      }
    }
  }

  console.log("Mock applicants and profiles created successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
