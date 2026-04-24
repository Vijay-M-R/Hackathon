import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function generateModuleTest(userId, moduleKey) {
  const [subjectRaw, ...topicParts] = moduleKey.split("_");
  const subject = subjectRaw.replace(/_/g, " ");
  const topic = topicParts.join(" ");

  try {
    const aiResponse = await fetch("http://localhost:8000/generate-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, topic, count: 3 })
    });
    
    if (!aiResponse.ok) {
      throw new Error(`AI Service failed with status ${aiResponse.status}`);
    }
    
    const aiData = await aiResponse.json();
    const durationMinutes = aiData.durationMinutes || 10;
    const generatedQuestions = aiData.questions || [];

    const savedQuestions = [];
    
    let aiTag = await prisma.tag.findUnique({ where: { name: "AI_GENERATED" } });
    if (!aiTag) {
      aiTag = await prisma.tag.create({ data: { name: "AI_GENERATED" } });
    }

    for (const q of generatedQuestions) {
      const savedQ = await prisma.question.create({
        data: {
          text: q.question_text || "Missing question text",
          answer: q.answer || "Missing answer",
          options: q.options || [],
          type: q.type || "MCQ",
          subject: subject,
          topic: topic,
          difficulty: q.difficulty || "MEDIUM",
          isVisible: false,
          uploadedBy: { connect: { id: userId } },
          tags: { connect: [{ id: aiTag.id }] }
        }
      });
      savedQuestions.push(savedQ);
    }

    return {
      moduleKey,
      subject,
      topic,
      totalQuestions: savedQuestions.length,
      durationMinutes: durationMinutes,
      questions: savedQuestions.map(q => ({
        id: q.id,
        text: q.text,
        options: Array.isArray(q.options) ? q.options : [],
        difficulty: q.difficulty || "MEDIUM",
        subject: q.subject,
        topic: q.topic
      }))
    };
  } catch (err) {
    console.error("Error generating AI module test:", err);
    throw new Error("Failed to generate dynamic test from AI service");
  }
}

async function main() {
  const user = await prisma.user.findFirst({where:{email:'student1@example.com'}});
  const result = await generateModuleTest(user.id, "computer_science_data_structures");
  console.log("Success:", result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
