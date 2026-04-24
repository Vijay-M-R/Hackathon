import { prisma } from "./src/config/db.js";

async function main() {
  // 1. Find a company user
  const companyUser = await prisma.user.findFirst({
    where: { role: "COMPANY" },
    include: { company: true }
  });

  if (!companyUser || !companyUser.company) {
    console.log("No company user found to add mock data to.");
    return;
  }

  const companyId = companyUser.company.id;
  const collegeName = "PlaceReady Institute"; // Mock college

  console.log(`Adding mock data for company: ${companyUser.company.name}`);

  // 2. Add some mock inbound requests
  await prisma.inboundRequest.createMany({
    data: [
      {
        companyId,
        title: "Software Engineering Intern - 2025",
        description: "Looking for bright minds to join our engineering team.",
        ctc: "15",
        minCgpa: 8.0,
        minReadiness: 75.0,
        requiredSkills: ["React", "Node.js", "TypeScript"],
        targetCollege: collegeName,
        status: "APPROVED",
        poFeedback: "Great profile, approved for upcoming drive."
      },
      {
        companyId,
        title: "Data Scientist",
        description: "Analyze large datasets and build predictive models.",
        ctc: "22",
        minCgpa: 8.5,
        minReadiness: 80.0,
        requiredSkills: ["Python", "SQL", "ML"],
        targetCollege: collegeName,
        status: "PENDING"
      }
    ]
  });

  // 3. Add some mock drives
  await prisma.placementDrive.createMany({
    data: [
      {
        companyId,
        title: "Campus Recruitment 2025",
        role: "Software Engineer",
        description: "Full-time role for graduating batch.",
        salary: "18 LPA",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        location: "Main Seminar Hall",
        status: "ACTIVE"
      },
      {
        companyId,
        title: "Winter Internship Drive",
        role: "Product Management Intern",
        description: "3-month internship program.",
        salary: "50k / month",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        location: "Online",
        status: "COMPLETED"
      }
    ]
  });

  console.log("Mock data created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
