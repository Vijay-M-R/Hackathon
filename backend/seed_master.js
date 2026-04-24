import { prisma } from "./src/config/db.js";
import { hashPassword } from "./src/utils/hash.js";

async function main() {
  console.log("🚀 Starting Clean Master Data Seed (Indian Ecosystem - 6 Months History)...");

  // 0. CLEAR EXISTING DATA (Ordered for constraints)
  console.log("🧹 Clearing old data...");
  try {
    await prisma.interviewMessage.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.assessmentAttempt.deleteMany({});
    await prisma.mockInterview.deleteMany({});
    await prisma.inboundRequest.deleteMany({});
    await prisma.placementDrive.deleteMany({});
    await prisma.trainingTestResult.deleteMany({});
    await prisma.trainingModuleProgress.deleteMany({});
    await prisma.assessment.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.studentProfile.deleteMany({});
    await prisma.user.deleteMany({ where: { role: { in: ["STUDENT", "COMPANY", "PLACEMENT", "FACULTY"] } } });
    await prisma.company.deleteMany({});
  } catch (err) {
    console.log("⚠️ Cleanup warning:", err.message);
  }

  const password = await hashPassword("password123");
  const collegeName = "Indian Institute of Placement & Excellence (IIPE)";

  // 1. Placement Officer
  const po = await prisma.user.upsert({
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
        readinessScore: 0, // Will update after attempts
        semester: 7,
        placementStatus: "APPLIED",
        aiFeedback: "Student profile initialized. Awaiting diagnostic assessment results."
      }
    });
    students.push(user);
  }
  console.log(`✅ ${students.length} Indian Student profiles seeded.`);

  // 5. Assessments & Historical Attempts (6 Months)
  console.log("📊 Generating 6-month historical performance data...");
  const assessmentTypes = ["APTITUDE", "CORE", "SOFT_SKILLS"];
  const assessments = [];

  for (const type of assessmentTypes) {
    const assessment = await prisma.assessment.create({
      data: {
        title: `${type.charAt(0) + type.slice(1).toLowerCase()} Diagnostic Test`,
        type: type,
        subject: type === "CORE" ? "Computer Science" : "General",
        scheduledAt: new Date(),
        duration: 60,
        createdById: po.id
      }
    });
    assessments.push(assessment);
  }

  const now = new Date();
  for (const student of students) {
    let avgAptitude = 0, avgCore = 0, avgSoft = 0;
    
    // Create ~15 attempts per student over 6 months
    for (let m = 0; m < 6; m++) {
      for (const assessment of assessments) {
        const attemptDate = new Date(now);
        attemptDate.setMonth(now.getMonth() - (5 - m));
        attemptDate.setDate(Math.floor(Math.random() * 28) + 1);

        const baseScore = 50 + (m * 5); // Improving trend
        const score = Math.min(100, baseScore + (Math.random() * 20));
        
        await prisma.assessmentAttempt.create({
          data: {
            userId: student.id,
            assessmentId: assessment.id,
            score: score,
            correctCount: Math.floor((score / 100) * 50),
            totalCount: 50,
            timeTaken: 1800 + Math.floor(Math.random() * 1200),
            createdAt: attemptDate,
            answers: { mock: true }
          }
        });

        if (assessment.type === "APTITUDE") avgAptitude = score;
        if (assessment.type === "CORE") avgCore = score;
        if (assessment.type === "SOFT_SKILLS") avgSoft = score;
      }
    }

    // Update profile with latest averages/scores
    await prisma.studentProfile.update({
      where: { userId: student.id },
      data: {
        aptitudeScore: parseFloat(avgAptitude.toFixed(2)),
        coreScore: parseFloat(avgCore.toFixed(2)),
        softSkillsScore: parseFloat(avgSoft.toFixed(2)),
        codingScore: parseFloat((avgCore * 0.9).toFixed(2)),
        readinessScore: parseFloat(((avgAptitude + avgCore + avgSoft) / 3).toFixed(2)),
        aiFeedback: `Showing steady improvement over 6 months. Strong in ${avgAptitude > 80 ? 'Quantitative Aptitude' : 'Logical Reasoning'}. Recommended to focus on advanced ${avgCore < 70 ? 'System Design' : 'Algorithm Optimization'}.`
      }
    });
  }
  console.log("✅ 6-month historical attempts and profiles updated.");

  // 6. Recruitment Drives
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

  // 7. Inbound Requests
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

  console.log("\n✨ 6-Month Indian Ecosystem successfully seeded!");
  console.log("   - Credentials unchanged. Use po@iipe.edu.in, recruiter@tcs.com, or rahul.deshmukh@gmail.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
