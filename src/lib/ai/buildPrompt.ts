import { QuestionTypeSchema } from "@/lib/schemas/questionSchema";

export interface BuildPromptOptions {
  topic: string;
  count: number;
  difficulty?: "easy" | "medium" | "hard";
  types?: Array<"multiple_choice" | "true_false" | "multi_select">;
}

export function buildPrompt(opts: BuildPromptOptions): string {
  const { topic, count, difficulty = "medium", types = ["multiple_choice", "true_false"] } = opts;

  const typeList = types.join(", ");
  const difficultyHint =
    difficulty === "easy"
      ? "Câu hỏi đơn giản, dễ hiểu."
      : difficulty === "hard"
      ? "Câu hỏi khó, đòi hỏi suy luận sâu."
      : "Câu hỏi mức độ trung bình.";

  return [
    `Bạn là một giáo viên tạo câu hỏi trắc nghiệm.`,
    `Chủ đề: ${topic}`,
    `Số lượng: ${count}`,
    `Độ khó: ${difficulty} — ${difficultyHint}`,
    `Loại câu hỏi cho phép: ${typeList}`,
    ``,
    `Yêu cầu output: Trả về MỘT mảng JSON hợp lệ, mỗi phần tử là object theo schema:`,
    `{ "id": string, "type": "multiple_choice" | "true_false" | "multi_select", "prompt": string, "explanation"?: string, ... }`,
    `Không thêm markdown, không thêm text ngoài JSON. Chỉ trả về JSON array.`,
  ].join("\n");
}
