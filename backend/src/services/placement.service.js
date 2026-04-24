import { prisma } from "../config/db.js";
import { NotificationService } from "./notification.service.js";

export const PlacementService = {
  async getCompanies() {
    return await prisma.company.findMany({ include: { drives: true } });
  },

  async createCompany(data) {
    return await prisma.company.create({ data });
  },

  async createDrive(data) {
     return await prisma.placementDrive.create({
      data: { 
        ...data,
        date: new Date(data.date),
        title: data.title || "Placement Drive" 
      }
    });
  },

  async getCompanyDrives(companyId) {
    const drives = await prisma.placementDrive.findMany({
      where: { companyId },
      include: {
        students: { include: { StudentProfile: { select: { placementStatus: true } } } }
      },
      orderBy: { date: "desc" }
    });

    return drives.map(d => ({
      ...d,
      applicantCount: d.students.length,
      offersCount: d.students.filter(s => s.StudentProfile?.placementStatus === "OFFERED").length,
    }));
  },

  async updateDrive(driveId, companyId, data) {
    // Security check: Ensure the drive belongs to the company
    const drive = await prisma.placementDrive.findUnique({ where: { id: driveId } });
    if (!drive || drive.companyId !== companyId) {
      throw new Error("Unauthorized to update this drive");
    }

    return await prisma.placementDrive.update({
      where: { id: driveId },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined
      }
    });
  },

  async getAllDrives(userId) {
    const drives = await prisma.placementDrive.findMany({
      include: {
        company: true,
        students: { include: { StudentProfile: { select: { placementStatus: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    return drives.map(d => ({
      ...d,
      applicantCount: d.students.length,
      offersCount: d.students.filter(s => s.StudentProfile?.placementStatus === "OFFERED").length,
      hasApplied: userId ? d.students.some(s => s.id === userId) : false,
      studentStatus: userId ? d.students.find(s => s.id === userId)?.StudentProfile?.placementStatus : null,
    }));
  },

  async applyToDrive(userId, driveId) {
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: { company: true }
    });
    if (!drive) throw new Error("Drive not found");

    const student = await prisma.studentProfile.findUnique({
      where: { userId }
    });
    if (!student) throw new Error("Student profile not found. Please complete your profile first.");

    // Logic: minCgpa and minReadiness check
    const minCgpa = drive.company.minCgpa || 0;
    const minReadiness = drive.company.minReadiness || 0;

    if ((student.cgpa || 0) < minCgpa) {
      throw new Error(`Ineligible: Minimum CGPA required is ${minCgpa}. Your CGPA is ${student.cgpa || 0}.`);
    }

    if ((student.readinessScore || 0) < minReadiness) {
      throw new Error(`Ineligible: Minimum Readiness Score required is ${minReadiness}%. Your score is ${student.readinessScore || 0}%.`);
    }

    const existing = await prisma.placementDrive.findFirst({
      where: { id: driveId, students: { some: { id: userId } } }
    });
    if (existing) throw new Error("Already applied to this drive");

    await prisma.placementDrive.update({
      where: { id: driveId },
      data: { students: { connect: { id: userId } } }
    });

    await prisma.studentProfile.update({
      where: { userId },
      data: { placementStatus: "APPLIED" }
    });

    await NotificationService.createNotification(userId, {
      title: "Drive Application",
      message: `You have successfully applied to ${drive.company.name} - ${drive.role}. Check your dashboard for status updates.`,
      type: "DRIVE"
    });

    return true;
  },

  async getApplicants(driveId) {
    const drive = await prisma.placementDrive.findUnique({
      where: { id: driveId },
      include: {
        company: true,
        students: {
          select: {
            id: true, name: true, email: true, usn: true, fullName: true,
            StudentProfile: { select: { cgpa: true, readinessScore: true, branch: true, placementStatus: true } }
          }
        }
      }
    });

    if (!drive) throw new Error("Drive not found");

    return {
      drive,
      applicants: drive.students.map(u => ({
        id: u.id,
        name: u.name || u.fullName || u.email.split("@")[0],
        email: u.email,
        roll: u.usn || "N/A",
        cgpa: u.StudentProfile?.cgpa ?? 0,
        readiness: u.StudentProfile?.readinessScore ?? 0,
        branch: u.StudentProfile?.branch ?? "—",
        placementStatus: u.StudentProfile?.placementStatus ?? "APPLIED",
      }))
    };
  },

  async getTrends() {
    // Generate placement trends aggregated data
    const drives = await prisma.placementDrive.findMany({
      include: {
        students: {
          include: { StudentProfile: { select: { placementStatus: true } } }
        }
      }
    });

    // Group by month
    const monthlyData = {};
    drives.forEach(drive => {
      const monthRaw = drive.date || drive.createdAt;
      const month = new Date(monthRaw).toLocaleString('default', { month: 'short' });
      if (!monthlyData[month]) {
        monthlyData[month] = { name: month, companies: 0, offers: 0 };
      }
      monthlyData[month].companies += 1;
      monthlyData[month].offers += drive.students.filter(
        s => s.StudentProfile?.placementStatus === "OFFERED" || s.StudentProfile?.placementStatus === "PLACED"
      ).length;
    });

    const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const placementTrends = monthsOrder
      .filter(m => monthlyData[m])
      .map(m => monthlyData[m]);

    return { placementTrends };
  },

  async getColleges() {
    const poUsers = await prisma.user.findMany({
      where: { role: "PLACEMENT", NOT: { collegeName: null } },
      select: { collegeName: true },
      distinct: ["collegeName"]
    });
    return poUsers.map(u => u.collegeName);
  },

  async getInboundRequests(poUserId) {
    const po = await prisma.user.findUnique({
      where: { id: poUserId },
      select: { collegeName: true }
    });

    return await prisma.inboundRequest.findMany({
      where: {
        OR: [
          { targetCollege: po?.collegeName },
          { targetCollege: null } // Show unassigned requests too
        ]
      },
      include: { company: true },
      orderBy: { createdAt: "desc" }
    });
  },

  async handleInboundRequest(requestId, { status, feedback }) {
    const request = await prisma.inboundRequest.findUnique({
      where: { id: requestId },
      include: { company: true }
    });

    if (!request) throw new Error("Request not found");

    const updated = await prisma.inboundRequest.update({
      where: { id: requestId },
      data: {
        status,
        poFeedback: feedback,
        poDecisionAt: new Date()
      }
    });

    // If approved, optionally create a draft drive
    if (status === "APPROVED") {
      // Sync company requirements from request
      await prisma.company.update({
        where: { id: request.companyId },
        data: {
          ctc: request.ctc || "N/A",
          minCgpa: request.minCgpa || 7.0,
          minReadiness: request.minReadiness || 70.0,
          requiredSkills: request.requiredSkills || []
        }
      });

      await prisma.placementDrive.create({
        data: {
          title: request.title,
          description: request.description,
          date: new Date(), 
          companyId: request.companyId,
          role: request.title,
          salary: request.ctc,
          status: "UPCOMING"
        }
      });
    }

    return updated;
  }
};
