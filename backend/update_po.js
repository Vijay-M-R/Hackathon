import { prisma } from "./src/config/db.js";

async function updatePO() {
  await prisma.user.update({
    where: { email: "placement@placeready.com" },
    data: { collegeName: "Stanford University" }
  });
  console.log("Updated PO with college: Stanford University");
}

updatePO().finally(() => prisma.$disconnect());
