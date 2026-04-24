import { prisma } from './src/config/db.js';

async function main() {
  await prisma.user.create({
    data: {
      email: 'student1@example.com',
      password: 'password123',
      role: 'STUDENT',
      name: 'John Doe',
      fullName: 'John Doe',
      usn: '1RV20CS001',
      department: 'CSE',
      StudentProfile: {
        create: {
          id: 'sp_001',
          branch: 'CSE',
          cgpa: 8.5,
          aptitudeScore: 80,
          codingScore: 90,
          coreScore: 85,
          softSkillsScore: 75,
          semester: 6,
          readinessScore: 82,
          placementStatus: 'UNPLACED'
        }
      }
    }
  });

  await prisma.user.create({
    data: {
      email: 'student2@example.com',
      password: 'password123',
      role: 'STUDENT',
      name: 'Jane Smith',
      fullName: 'Jane Smith',
      usn: '1RV20CS002',
      department: 'CSE',
      StudentProfile: {
        create: {
          id: 'sp_002',
          branch: 'CSE',
          cgpa: 9.1,
          aptitudeScore: 85,
          codingScore: 95,
          coreScore: 88,
          softSkillsScore: 90,
          semester: 6,
          readinessScore: 90,
          placementStatus: 'UNPLACED'
        }
      }
    }
  });

  console.log('Successfully added 2 sample students');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
