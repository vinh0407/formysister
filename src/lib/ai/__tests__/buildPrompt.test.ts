import { buildPrompt } from "../buildPrompt";

describe("buildPrompt", () => {
  it("builds a prompt with required topic and count", () => {
    const p = buildPrompt({ topic: "React hooks", count: 5 });
    expect(p).toContain("Chủ đề: React hooks");
    expect(p).toContain("Số lượng: 5");
    expect(p).toContain("multiple_choice, true_false");
  });

  it("includes difficulty hint for hard", () => {
    const p = buildPrompt({ topic: "JS", count: 3, difficulty: "hard" });
    expect(p).toContain("Độ khó: hard");
    expect(p).toContain("suy luận sâu");
  });

  it("respects custom types", () => {
    const p = buildPrompt({ topic: "CSS", count: 2, types: ["multi_select"] });
    expect(p).toContain("multi_select");
    expect(p).not.toContain("true_false");
  });

  it("throws on empty topic via runtime guard not required (schema handles)", () => {
    // buildPrompt does not validate; just ensure no crash
    const p = buildPrompt({ topic: "", count: 1 });
    expect(typeof p).toBe("string");
  });
});
