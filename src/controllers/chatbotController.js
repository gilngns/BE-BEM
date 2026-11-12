import { chatbotChat, chatbotTanya } from "../lib/aiClient.js";
import { badRequest, getBody, parseString } from "../lib/validate.js";

const MAX_PESAN = 20;
const MAX_PANJANG = 2000;

// POST /api/chatbot/tanya  { pertanyaan }
export const tanya = async (req, res) => {
  const body = getBody(req);
  const pertanyaan = parseString(body.pertanyaan, "pertanyaan", { maxLength: MAX_PANJANG });

  const data = await chatbotTanya(pertanyaan);
  res.json({ success: true, data });
};

// POST /api/chatbot/chat  { messages: [{ role: "user"|"assistant", content }] }
export const chat = async (req, res) => {
  const body = getBody(req);
  const { messages } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw badRequest("messages wajib berupa list dan tidak boleh kosong");
  }
  // Ambil riwayat terakhir saja supaya request ke LLM tetap kecil
  const recent = messages.slice(-MAX_PESAN);

  const clean = recent.map((m, i) => {
    if (!m || typeof m !== "object") throw badRequest(`messages[${i}] tidak valid`);
    if (m.role !== "user" && m.role !== "assistant") {
      throw badRequest(`messages[${i}].role harus "user" atau "assistant"`);
    }
    return { role: m.role, content: parseString(m.content, `messages[${i}].content`, { maxLength: MAX_PANJANG }) };
  });

  if (clean[clean.length - 1].role !== "user") {
    throw badRequest("Pesan terakhir harus dari user");
  }

  const data = await chatbotChat(clean);
  res.json({ success: true, data });
};
