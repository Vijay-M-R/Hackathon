import { prisma } from "../config/db.js";
import { NotificationService } from "./notification.service.js";

export const ReminderService = {
  async checkAndSendReminders() {
    try {
      const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);
      const nineMinutesFromNow = new Date(Date.now() + 9 * 60 * 1000);

      const upcomingInterviews = await prisma.mockInterview.findMany({
        where: {
          status: "SCHEDULED",
          scheduledAt: {
            gte: nineMinutesFromNow,
            lte: tenMinutesFromNow
          }
        },
        include: { student: true }
      });

      for (const interview of upcomingInterviews) {
        await NotificationService.createNotification(interview.studentId, {
          title: "Interview Starting Soon",
          message: `Your mock interview "${interview.title}" starts in 10 minutes. Get ready!`,
          type: "URGENT"
        });
      }
    } catch (error) {
      console.error("Reminder check failed", error);
    }
  },

  startService() {
    // Check every minute
    setInterval(() => this.checkAndSendReminders(), 60000);
  }
};
