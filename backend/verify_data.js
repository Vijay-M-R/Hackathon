import { prisma } from "./src/config/db.js";

async function verify() {
  const drives = await prisma.placementDrive.findMany({
    include: { company: true }
  });
  console.log(`\nFound ${drives.length} drives:`);
  drives.forEach(d => console.log(`- ${d.title} (${d.company.name}) Status: ${d.status}`));

  const requests = await prisma.inboundRequest.findMany({
    include: { company: true }
  });
  console.log(`\nFound ${requests.length} requests:`);
  requests.forEach(r => console.log(`- ${r.title} (${r.company.name}) Status: ${r.status}`));
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
