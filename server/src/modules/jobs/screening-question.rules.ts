import { BadRequestException } from "@nestjs/common";
import type { ScreeningQuestionInputDto } from "./dto/screening-question.dto";

export function normalizeScreeningQuestions(questions: readonly ScreeningQuestionInputDto[]) {
  const orders = new Set<number>();
  return questions.map((question) => {
    if (orders.has(question.displayOrder)) {
      throw new BadRequestException({ code: "SCREENING_ORDER_DUPLICATE", message: "Question display order must be unique." });
    }
    orders.add(question.displayOrder);
    const choice = question.type === "SELECT" || question.type === "MULTI_SELECT";
    if (!choice && question.options !== undefined) {
      throw new BadRequestException({ code: "SCREENING_OPTIONS_INVALID", message: "Options are only allowed for choice questions." });
    }
    if (!choice) return { ...question, options: undefined };
    const options = question.options?.map((option) => option.trim());
    if (!options || options.length < 2 || options.some((option) => !option || option.length > 120) ||
        new Set(options.map((option) => option.toLocaleLowerCase("en-US"))).size !== options.length) {
      throw new BadRequestException({ code: "SCREENING_OPTIONS_INVALID", message: "Choice questions need 2–20 distinct nonempty options of at most 120 characters." });
    }
    return { ...question, options };
  }).sort((a, b) => a.displayOrder - b.displayOrder);
}
