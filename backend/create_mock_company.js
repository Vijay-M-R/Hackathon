import { prisma } from "./src/config/db.js";
import bcrypt from "bcryptjs";

async function createMockCompany() {
  const email = "recruiter@google.com";
  const password = await bcrypt.hash("password123", 10);
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Mock recruiter already exists.");
    return;
  }

  let company = await prisma.company.findUnique({ where: { name: "Google India" } });
  
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Google India",
        website: "careers.google.com",
        industry: "Product"
      }
    });
  }

  await prisma.user.create({
    data: {
      email,
      password,
      role: "COMPANY",
      companyId: company.id,
      name: "Google Recruiter",
      fullName: "Sundar Pichai"
    }
  });

  console.log("Mock recruiter created: recruiter@google.com / password123");
}

createMockCompany().finally(() => prisma.$disconnect());
