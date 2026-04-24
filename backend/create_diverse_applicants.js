import { prisma } from "./src/config/db.js";

async function main() {
  const mockNames = [
    "Rahul Sharma", "Priya Patel", "Ananya Iyer", "Arjun Reddy", 
    "Siddharth Rao", "Ishani Gupta", "Vikram Singh", "Meera Nair", 
    "Karthik Swamy", "Sneha Kulkarni"
  ];
  
  const branches = ["CSE", "ECE", "ISE", "Mechanical"];
  const students = [];

  console.log("Generating 10 diverse student profiles...");

  for (let i = 0; i < mockNames.length; i++) {
    const name = mockNames[i];
    const email = `${name.toLowerCase().replace(" ", ".")}@example.com`;
    const usn = `1RV21${branches[i % 4].slice(0, 2)}${String(100 + i).padStart(3, "0")}`;
    
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: "password123",
        role: "STUDENT",
        name,
        fullName: name,
        usn,
        collegeName: "PlaceReady Institute",
      }
    });
    
    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        readinessScore: Math.floor(65 + Math.random() * 30),
        cgpa: parseFloat((7.5 + Math.random() * 2).toFixed(2)),
      },
      create: {
        userId: user.id,
        id: usn,
        branch: branches[i % 4],
        cgpa: parseFloat((7.5 + Math.random() * 2).toFixed(2)),
        readinessScore: Math.floor(65 + Math.random() * 30),
        semester: 7,
        placementStatus: "APPLIED",
        aiFeedback: "Solid technical base. Focus on optimizing time complexity in coding rounds."
      }
    });
    
    students.push(user);
  }

  const drives = await prisma.placementDrive.findMany({
    where: { company: { name: "Google India" } }
  });

  if (drives.length === 0) {
    console.log("No Google India drives found. Run create_mock_data.js first.");
    return;
  }

  for (const drive of drives) {
    console.log(`Adding applicants to drive: ${drive.title}`);
    for (const student of students) {
      await prisma.placementDrive.update({
        where: { id: drive.id },
        data: {
          students: {
            connect: { id: student.id }
          }
        }
      });
      
      // Add a mock assessment
      const assessment = await prisma.assessment.findFirst();
      if (assessment) {
        await prisma.assessmentAttempt.create({
          data: {
            userId: student.id,
            assessmentId: assessment.id,
            score: 70 + Math.random() * 25,
            correctCount: 35,
            totalCount: 50,
            timeTaken: 1500,
            focusLossCount: Math.floor(Math.random() * 3),
            answers: { mock: true }
          }
        });
      }
    }
  }

  console.log(`Successfully added ${students.length} diverse applicants to ${drives.length} drives.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
