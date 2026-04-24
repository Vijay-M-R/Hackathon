import { prisma } from "../config/db.js";
import { hashPassword } from "../utils/hash.js";

export const CompanyService = {
  async register({ email, password, name, website, industry }) {
    // 1. Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already registered");

    // 2. Hash password
    const hashedPassword = await hashPassword(password);

    // 3. Create Company and User in a transaction
    return await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name,
          website,
          industry,
        }
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role: "COMPANY",
          companyId: company.id,
          name: name // Sync name
        }
      });

      return { user, company };
    });
  },

  async sendPlacementRequest(companyId, data) {
    if (!companyId) throw new Error("Recruiter is not associated with any company");
    return await prisma.inboundRequest.create({
      data: {
        title: data.title,
        description: data.description,
        ctc: data.ctc,
        minCgpa: parseFloat(data.minCgpa) || 0,
        minReadiness: parseFloat(data.minReadiness) || 0,
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        targetCollege: data.targetCollege,
        companyId: companyId,
        status: "PENDING"
      }
    });
  },

  async getMyRequests(companyId) {
    if (!companyId) return [];
    return await prisma.inboundRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" }
    });
  },

  async getMyDrives(companyId) {
    if (!companyId) return [];
    const drives = await prisma.placementDrive.findMany({
      where: { companyId },
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { date: "desc" }
    });

    return drives.map(d => ({
      ...d,
      applicantCount: d._count.students,
      offersCount: 0 // In a real app, this would be filtered by student status
    }));
  },

  async getDriveApplicants(driveId) {
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: {
        students: {
          include: {
            StudentProfile: true
          }
        }
      }
    });

    if (!drive) throw new Error("Drive not found");

    return {
      drive,
      applicants: drive.students.map(s => ({
        id: s.id,
        name: s.name || s.fullName,
        email: s.email,
        usn: s.usn,
        branch: s.StudentProfile?.branch || "N/A",
        cgpa: s.StudentProfile?.cgpa || 0,
        readiness: s.StudentProfile?.readinessScore || 0,
        placementStatus: s.StudentProfile?.placementStatus || "APPLIED"
      }))
    };
  },

  async updateDrive(driveId, companyId, data) {
    // Ensure the drive belongs to this company
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId }
    });

    if (!drive || drive.companyId !== companyId) {
      throw new Error("Unauthorized to update this drive");
    }

    return await prisma.placementDrive.update({
      where: { id: driveId },
      data: {
        location: data.location,
        date: data.date ? new Date(data.date) : undefined,
        status: data.status,
        description: data.description,
        salary: data.salary,
        role: data.role
      }
    });
  }
};
