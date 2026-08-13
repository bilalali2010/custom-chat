import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const body = await req.json();
    const message = body.message;

    const filePath = path.join(process.cwd(), "data", "coaching.json");
    const coachingData = fs.readFileSync(filePath, "utf-8");

    const systemPrompt =
      "You are the virtual assistant for NextGen Coaching Institute.\n\n" +
      "Rules:\n" +
      "- Answer ONLY using the coaching institute information below\n" +
      "- You do NOT have appointment booking capability\n" +
      "- If asked to book an appointment or reserve a seat, say:\n" +
      "  I can provide information, but I don't have appointment booking capability. Please contact us directly.\n" +
      "- If information is missing from the data below, say:\n" +
      "  I don't have that information yet.\n" +
      "- Keep answers friendly, concise, and on-topic (courses, fees, timings, admissions, faculty, facilities).\n\n" +
      "NextGen Coaching Institute Information:\n" +
      coachingData;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "poolside/laguna-s-2.1:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ]
        })
      }
    );

    const data = await response.json();

    return new Response(
      JSON.stringify({
        reply:
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content
            ? data.choices[0].message.content
            : "I don't have that information yet."
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ reply: "Server error. Please try again." }),
      { status: 500 }
    );
  }
}
