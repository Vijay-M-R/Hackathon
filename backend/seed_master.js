import { prisma } from "./src/config/db.js";
import { hashPassword } from "./src/utils/hash.js";

async function main() {
  console.log("🚀 Starting Clean Master Data Seed (Indian Ecosystem)...");

  // 0. CLEAR EXISTING DATA (Ordered for constraints)
  console.log("🧹 Clearing old data...");
  try {
    // Level 4 (Dependencies of dependencies)
    await prisma.interviewMessage.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.assessmentAttempt.deleteMany({});
    
    // Level 3
    await prisma.mockInterview.deleteMany({});
    await prisma.inboundRequest.deleteMany({});
    await prisma.placementDrive.deleteMany({});
    await prisma.trainingTestResult.deleteMany({});
    await prisma.trainingModuleProgress.deleteMany({});

    // Level 2
    await prisma.assessment.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.studentProfile.deleteMany({});
    
    // Level 1
    await prisma.user.deleteMany({ where: { role: { in: ["STUDENT", "COMPANY", "PLACEMENT", "FACULTY"] } } });
    await prisma.company.deleteMany({});
  } catch (err) {
    console.log("⚠️ Cleanup warning:", err.message);
  }

  const password = await hashPassword("password123");
  const collegeName = "Indian Institute of Placement & Excellence (IIPE)";

  // 1. Placement Officer
  await prisma.user.upsert({
    where: { email: "po@iipe.edu.in" },
    update: { collegeName },
    create: {
      email: "po@iipe.edu.in",
      password,
      role: "PLACEMENT",
      fullName: "Dr. Rajesh K. Varma",
      name: "Rajesh",
      collegeName,
    }
  });
  console.log("✅ Placement Officer created.");

  // 2. Indian Companies
  const companies = [
    { name: "TATA Consultancy Services (TCS)", website: "tcs.com", industry: "IT Services", ctc: "12 LPA", minCgpa: 7.5, minReadiness: 65.0 },
    { name: "Infosys Limited", website: "infosys.com", industry: "IT Consulting", ctc: "10 LPA", minCgpa: 7.0, minReadiness: 60.0 },
    { name: "Reliance Industries", website: "ril.com", industry: "Conglomerate", ctc: "18 LPA", minCgpa: 8.0, minReadiness: 75.0 },
    { name: "Wipro Technologies", website: "wipro.com", industry: "IT Services", ctc: "9.5 LPA", minCgpa: 7.0, minReadiness: 60.0 },
    { name: "Zomato", website: "zomato.com", industry: "Product / FoodTech", ctc: "24 LPA", minCgpa: 8.5, minReadiness: 80.0 }
  ];

  const companyMap = {};
  for (const c of companies) {
    const created = await prisma.company.create({ data: c });
    companyMap[c.name] = created.id;
  }
  console.log("✅ Indian Companies seeded.");

  // 3. Indian Recruiter Users
  const recruiters = [
    { email: "recruiter@tcs.com", fullName: "N. Chandrasekaran", companyId: companyMap["TATA Consultancy Services (TCS)"] },
    { email: "hr@infosys.com", fullName: "Salil Parekh", companyId: companyMap["Infosys Limited"] },
    { email: "hiring@ril.com", fullName: "Mukesh Ambani", companyId: companyMap["Reliance Industries"] },
    { email: "talent@zomato.com", fullName: "Deepinder Goyal", companyId: companyMap["Zomato"] }
  ];

  for (const r of recruiters) {
    await prisma.user.create({
      data: {
        email: r.email,
        password,
        role: "COMPANY",
        fullName: r.fullName,
        name: r.fullName.split(".")[0].split(" ")[0],
        companyId: r.companyId
      }
    });
  }
  console.log("✅ Indian Recruiter accounts seeded.");

  // 4. Indian Students
  const branches = ["CSE", "ECE", "ISE", "Mechanical"];
  const studentNames = [
    "Rahul Deshmukh", "Priya Iyer", "Ananya Singh", "Arjun Reddy", 
    "Siddharth Rao", "Ishani Gupta", "Vikram Malhotra", "Meera Nair", 
    "Karthik Swamy", "Sneha Kulkarni", "Aditya Chatterjee", "Zoya Khan",
    "Rohan Gupta", "Tanya Sen", "Varun Mehta", "Deepak Kumar", 
    "Sushmita Roy", "Abhishek Jain", "Pooja Hegde", "Manoj Tiwari"
  ];

  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const name = studentNames[i];
    const email = `${name.toLowerCase().replace(" ", ".")}@gmail.com`;
    const usn = `1RV21${branches[i % 4].slice(0, 2)}${String(100 + i).padStart(3, "0")}`;

    const user = await prisma.user.create({
      data: {
        email,
        password,
        role: "STUDENT",
        fullName: name,
        name: name.split(" ")[0],
        usn,
        collegeName
      }
    });

    await prisma.studentProfile.create({
      data: {
        userId: user.id,
        id: usn,
        branch: branches[i % 4],
        cgpa: parseFloat((7.0 + Math.random() * 2.5).toFixed(2)),
        readinessScore: Math.floor(55 + Math.random() * 40),
        semester: 7,
        placementStatus: "APPLIED",
        aiFeedback: "Strong fundamentals in Data Structures. Recommended to focus on OS and DBMS for service-based companies."
      }
    });
    students.push(user);
  }
  console.log(`✅ ${students.length} Indian Student profiles seeded.`);

  // 5. Recruitment Drives
  const driveData = [
    { title: "TATA Digital Campus 2025", role: "Graduate Engineer Trainee", companyId: companyMap["TATA Consultancy Services (TCS)"], salary: "12 LPA", status: "ACTIVE", location: "Block A Seminar Hall" },
    { title: "Reliance JIO Hiring", role: "Software Developer", companyId: companyMap["Reliance Industries"], salary: "18 LPA", status: "UPCOMING", location: "Auditorium" },
    { title: "Infosys HackWithInfy", role: "Systems Engineer", companyId: companyMap["Infosys Limited"], salary: "10 LPA", status: "COMPLETED", location: "Online" },
    { title: "Zomato Ninja Program", role: "Backend Developer", companyId: companyMap["Zomato"], salary: "24 LPA", status: "ACTIVE", location: "Placement Cell" }
  ];

  for (const d of driveData) {
    await prisma.placementDrive.create({
      data: {
        ...d,
        date: new Date(Date.now() + (Math.random() > 0.5 ? 10 : -10) * 24 * 60 * 60 * 1000),
        description: `Campus recruitment for ${d.role} at ${d.title}. Candidates must have strong problem-solving skills.`,
        students: {
          connect: students.filter((_, idx) => idx % 3 === 0).map(s => ({ id: s.id }))
        }
      }
    });
  }
  console.log("✅ Recruitment drives seeded.");

  // 6. Inbound Requests
  await prisma.inboundRequest.createMany({
    data: [
      {
        companyId: companyMap["Wipro Technologies"],
        title: "Wipro Elite National Talent Hunt",
        description: "Hiring for Project Engineer role across India.",
        ctc: "9.5",
        minCgpa: 6.5,
        minReadiness: 60.0,
        requiredSkills: ["Java", "Python", "SQL"],
        targetCollege: collegeName,
        status: "PENDING"
      },
      {
        companyId: companyMap["Infosys Limited"],
        title: "Specialist Programmer Role",
        description: "High-tier coding role for competitive programmers.",
        ctc: "16",
        minCgpa: 8.0,
        minReadiness: 80.0,
        requiredSkills: ["Algorithms", "DS", "C++"],
        targetCollege: collegeName,
        status: "APPROVED"
      }
    ]
  });
  console.log("✅ Indian Partnership requests seeded.");

  console.log("\n✨ Indian Ecosystem successfully seeded!");
  console.log("   - PO: po@iipe.edu.in / password123");
  console.log("   - Recruiter: recruiter@tcs.com / password123");
  console.log("   - Student: rahul.deshmukh@gmail.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
