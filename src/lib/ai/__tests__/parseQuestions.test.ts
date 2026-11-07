import { parseQuestions } from "../parseQuestions";
import { Question } from "@/lib/schemas/questionSchema";

const validMC = {
  id: "q1",
  type: "multiple_choice",
  prompt: "React la gi?",
  options: ["Lib", "Framework", "Language", "Tool"],
  correctIndex: 0,
};

const validTF = {
  id: "q2",
  type: "true_false",
  prompt: "JS la ngo ngu typed?",
  correct: false,
};

const validMS = {
  id: "q3",
  type: "multi_select",
  prompt: "Chon cac hook",
  options: ["useState", "useEffect", "useMemo", "useCallback"],
  correctIndices: [0, 1],
};

describe("parseQuestions", () => {
  it("parses valid JSON array of questions", () => {
    const raw = JSON.stringify([validMC, validTF, validMS]);
    const result = parseQuestions(raw);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("multiple_choice");
    expect(result[1].type).toBe("true_false");
    expect(result[2].type).toBe("multi_select");
  });

  it("strips code fences", () => {
    const raw = "```json\n" + JSON.stringify({
      questions: [
        {
          id: "q1",
          type: "multiple_choice",
          question: "Test",
          options: ["A", "B", "C", "D"],
          answer: "A",
          explanation: "Test"
        }
      ]
    }) + "\n```";
    const result = parseQuestions(raw);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("multiple_choice");
  });
});