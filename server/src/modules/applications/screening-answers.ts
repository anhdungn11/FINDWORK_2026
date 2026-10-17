import { BadRequestException, ConflictException } from "@nestjs/common";
import type { Prisma, ScreeningQuestionType } from "../../generated/prisma/client";
import type { SubmitScreeningAnswerDto } from "./dto/application.dto";

export interface ActiveScreeningQuestion {
  id: string;
  type: ScreeningQuestionType;
  label: string;
  isRequired: boolean;
  displayOrder: number;
  options: Prisma.JsonValue;
}

function invalid(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}

function choiceOptions(question: ActiveScreeningQuestion): string[] {
  if (!Array.isArray(question.options) || question.options.length < 2 ||
      !question.options.every((option) => typeof option === "string")) {
    throw new ConflictException({ code: "SCREENING_CONFIGURATION_INVALID", message: "Screening question options are unavailable." });
  }
  return question.options as string[];
}

export function validateScreeningAnswers(questions: readonly ActiveScreeningQuestion[], answers: readonly SubmitScreeningAnswerDto[] = []) {
  const available = new Map(questions.map((question) => [question.id, question]));
  const seen = new Set<string>();
  const validated = answers.map(({ questionId, answer }) => {
    const question = available.get(questionId);
    if (!question) throw invalid("SCREENING_QUESTION_INVALID", "Answer must belong to an active question of this job.");
    if (seen.has(questionId)) throw invalid("SCREENING_ANSWER_DUPLICATE", "Each question can be answered only once.");
    seen.add(questionId);
    let value: string | boolean | string[];
    switch (question.type) {
      case "TEXT":
      case "TEXTAREA": {
        if (typeof answer !== "string") throw invalid("SCREENING_ANSWER_INVALID", "Text answer is required for this question.");
        const text = answer.trim();
        const limit = question.type === "TEXT" ? 500 : 5000;
        if (!text || text.length > limit) throw invalid("SCREENING_ANSWER_INVALID", `Text answer must contain 1–${limit} characters.`);
        value = text;
        break;
      }
      case "YES_NO":
        if (typeof answer !== "boolean") throw invalid("SCREENING_ANSWER_INVALID", "Yes/no answer must be a boolean.");
        value = answer;
        break;
      case "SELECT": {
        const options = choiceOptions(question);
        if (typeof answer !== "string" || !options.includes(answer)) {
          throw invalid("SCREENING_OPTION_INVALID", "Choose one listed option.");
        }
        value = answer;
        break;
      }
      case "MULTI_SELECT": {
        const options = choiceOptions(question);
        if (!Array.isArray(answer) || answer.length < 1 || answer.length > options.length ||
            !answer.every((item) => typeof item === "string" && options.includes(item)) ||
            new Set(answer).size !== answer.length) {
          throw invalid("SCREENING_OPTION_INVALID", "Choose distinct listed options.");
        }
        value = answer;
        break;
      }
    }
    const questionSnapshot = {
      id: question.id, type: question.type, label: question.label,
      isRequired: question.isRequired, displayOrder: question.displayOrder,
      options: question.options,
    };
    return { screeningQuestionId: questionId, answerValue: value, questionSnapshot };
  });
  if (questions.some((question) => question.isRequired && !seen.has(question.id))) {
    throw invalid("SCREENING_REQUIRED_ANSWER_MISSING", "All required screening questions must be answered.");
  }
  return validated;
}
