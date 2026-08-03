// ─── Quiz Question Types ────────────────────────────────────────────────────

export type NormalizedQuizQuestionType =
  | "choice"
  | "concept"
  | "fill_in_blank"
  | "short_answer"
  | "written"
  | "coding";

export const QUIZ_QUESTION_TYPES: ReadonlyArray<NormalizedQuizQuestionType> = [
  "choice",
  "concept",
  "fill_in_blank",
  "short_answer",
  "written",
  "coding",
];

const QUESTION_TYPE_ALIASES: Record<string, NormalizedQuizQuestionType> = {
  choice: "choice",
  multiple_choice: "choice",
  "multiple-choice": "choice",
  mcq: "choice",
  concept: "concept",
  true_false: "concept",
  "true-false": "concept",
  tf: "concept",
  judgement: "concept",
  fill_in_blank: "fill_in_blank",
  "fill-in-the-blank": "fill_in_blank",
  fill_in_the_blank: "fill_in_blank",
  cloze: "fill_in_blank",
  short_answer: "short_answer",
  "short-answer": "short_answer",
  written: "written",
  open_ended: "written",
  "open-ended": "written",
  open_response: "written",
  "open-response": "written",
  essay: "written",
  coding: "coding",
  code: "coding",
  programming: "coding",
};

export function normalizeQuizQuestionType(
  value: unknown,
): NormalizedQuizQuestionType {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return QUESTION_TYPE_ALIASES[normalized] || "short_answer";
}

export function isChoiceQuizQuestion(value: unknown): boolean {
  return normalizeQuizQuestionType(value) === "choice";
}

export function isConceptQuizQuestion(value: unknown): boolean {
  return normalizeQuizQuestionType(value) === "concept";
}

export function isFillInBlankQuizQuestion(value: unknown): boolean {
  return normalizeQuizQuestionType(value) === "fill_in_blank";
}

export function isFreeTextQuizQuestion(value: unknown): boolean {
  const t = normalizeQuizQuestionType(value);
  return t === "short_answer" || t === "written" || t === "coding";
}

export function resolveChoiceAnswerKey(
  correctAnswer: unknown,
  options: Record<string, string> | null | undefined,
): string {
  const correct = String(correctAnswer || "").trim();
  if (!correct || !options) return "";
  const directKey = correct.toUpperCase();
  if (directKey in options) return directKey;
  const normalizedAnswer = correct.toLowerCase();
  for (const [key, label] of Object.entries(options)) {
    if (normalizedAnswer === String(label || "").trim().toLowerCase()) {
      return key.toUpperCase();
    }
  }
  return directKey;
}

export function resolveConceptAnswer(
  correctAnswer: unknown,
): "true" | "false" | "" {
  const normalized = String(correctAnswer || "").trim().toLowerCase();
  if (normalized === "true") return "true";
  if (normalized === "false") return "false";
  return "";
}

// ─── Quiz Types ─────────────────────────────────────────────────────────────

export type DeepQuestionMode = "custom" | "mimic";

export interface DeepQuestionFormConfig {
  mode: DeepQuestionMode;
  topic: string;
  num_questions: number;
  difficulty: string;
  question_types: NormalizedQuizQuestionType[];
  per_type_counts: Partial<Record<NormalizedQuizQuestionType, number>>;
  paper_path: string;
  max_questions: number;
}

export const DEFAULT_QUIZ_CONFIG: DeepQuestionFormConfig = {
  mode: "custom",
  topic: "",
  num_questions: 3,
  difficulty: "auto",
  question_types: [],
  per_type_counts: {},
  paper_path: "",
  max_questions: 10,
};

export interface QuizQuestion {
  question_id: string;
  question: string;
  question_type: NormalizedQuizQuestionType;
  options?: Record<string, string>;
  correct_answer: string;
  explanation: string;
  difficulty?: string;
  concentration?: string;
  knowledge_context?: string;
}

export interface QuizFollowupContext {
  parent_quiz_session_id?: string;
  question_id: string;
  question: string;
  question_type: QuizQuestion["question_type"];
  options?: Record<string, string>;
  correct_answer: string;
  explanation: string;
  difficulty?: string;
  concentration?: string;
  knowledge_context?: string;
  user_answer?: string;
  is_correct?: boolean;
  user_answer_image_filenames?: string[];
  ai_judgment?: string;
}

export const QUIZ_TYPE_LABEL_KEYS: Record<NormalizedQuizQuestionType, string> = {
  choice: "Multiple Choice",
  concept: "Concept Question",
  fill_in_blank: "Fill in the Blank",
  short_answer: "Short Answer",
  written: "Essay",
  coding: "Coding",
};

export interface QuizFollowupExtras {
  userAnswerImageFilenames?: string[] | null;
  aiJudgment?: string | null;
}

export function extractStreamingQuizQuestions(
  events: Array<{ type?: string; metadata?: Record<string, unknown> }>,
): QuizQuestion[] | null {
  if (!Array.isArray(events) || events.length === 0) return null;
  const byId = new Map<string, { idx: number; qa: QuizQuestion }>();
  for (const event of events) {
    if (event.type !== "content") continue;
    const meta = (event.metadata ?? {}) as Record<string, unknown>;
    if (meta.call_kind !== "quiz_question_emitted") continue;
    const qa = meta.qa_pair as Record<string, unknown> | undefined;
    if (!qa || typeof qa !== "object" || !qa.question) continue;
    const idx = Number(meta.question_index);
    const question: QuizQuestion = {
      question_id: String(qa.question_id ?? ""),
      question: String(qa.question ?? ""),
      question_type: normalizeQuizQuestionType(qa.question_type),
      options: qa.options as Record<string, string> | undefined,
      correct_answer: String(qa.correct_answer ?? ""),
      explanation: String(qa.explanation ?? ""),
      difficulty: qa.difficulty ? String(qa.difficulty) : undefined,
      concentration: qa.concentration ? String(qa.concentration) : undefined,
    };
    const key = question.question_id || String(idx);
    byId.set(key, { idx: Number.isFinite(idx) ? idx : byId.size, qa: question });
  }
  if (byId.size === 0) return null;
  return Array.from(byId.values())
    .sort((a, b) => a.idx - b.idx)
    .map((entry) => entry.qa);
}

export function extractQuizQuestions(
  resultMetadata: Record<string, unknown> | undefined,
): QuizQuestion[] | null {
  if (!resultMetadata) return null;
  const summary = resultMetadata.summary as Record<string, unknown> | undefined;
  if (!summary) return null;
  const results = summary.results as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(results) || results.length === 0) return null;
  const parsed: Array<QuizQuestion | null> = results.map((item) => {
    const qa = (item.qa_pair ?? item) as Record<string, unknown>;
    if (!qa.question) return null;
    return {
      question_id: String(qa.question_id ?? ""),
      question: String(qa.question ?? ""),
      question_type: normalizeQuizQuestionType(qa.question_type),
      options: qa.options as Record<string, string> | undefined,
      correct_answer: String(qa.correct_answer ?? ""),
      explanation: String(qa.explanation ?? ""),
      difficulty: qa.difficulty ? String(qa.difficulty) : undefined,
      concentration: qa.concentration ? String(qa.concentration) : undefined,
      knowledge_context:
        qa.metadata &&
        typeof qa.metadata === "object" &&
        "knowledge_context" in qa.metadata &&
        qa.metadata.knowledge_context
          ? String(qa.metadata.knowledge_context)
          : undefined,
    };
  });
  return parsed.filter((q): q is QuizQuestion => q !== null);
}

export function buildQuizFollowupConfig(
  question: QuizQuestion,
  userAnswer: string,
  isCorrect: boolean | null,
  parentQuizSessionId?: string | null,
  extras?: QuizFollowupExtras,
): Record<string, unknown> {
  const filenames = (extras?.userAnswerImageFilenames ?? [])
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter((name) => name.length > 0);
  const context: QuizFollowupContext = {
    question_id: question.question_id,
    question: question.question,
    question_type: question.question_type,
    options: question.options,
    correct_answer: question.correct_answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    concentration: question.concentration,
    knowledge_context: question.knowledge_context,
    user_answer: userAnswer || undefined,
    is_correct: typeof isCorrect === "boolean" ? isCorrect : undefined,
    parent_quiz_session_id: parentQuizSessionId || undefined,
    user_answer_image_filenames: filenames.length > 0 ? filenames : undefined,
    ai_judgment: extras?.aiJudgment?.trim() || undefined,
  };
  return { followup_question_context: context };
}

export function buildQuizWSConfig(cfg: DeepQuestionFormConfig): Record<string, unknown> {
  if (cfg.mode === "mimic") {
    return { mode: "mimic", paper_path: cfg.paper_path.trim(), max_questions: cfg.max_questions };
  }
  const countsValid =
    cfg.question_types.length >= 2 &&
    Object.keys(cfg.per_type_counts).length > 0 &&
    Object.values(cfg.per_type_counts).reduce((sum, v) => sum + (v || 0), 0) ===
      cfg.num_questions;
  return {
    mode: "custom",
    num_questions: cfg.num_questions,
    difficulty: cfg.difficulty === "auto" ? "" : cfg.difficulty,
    question_types: cfg.question_types,
    per_type_counts: countsValid ? cfg.per_type_counts : {},
  };
}

// ─── Research Types ──────────────────────────────────────────────────────────

export type ResearchMode = "" | "notes" | "report" | "comparison" | "learning_path";
export type ResearchDepth = "" | "quick" | "standard" | "deep" | "manual";

export interface OutlineItem {
  title: string;
  overview: string;
}

export interface DeepResearchFormConfig {
  mode: ResearchMode;
  depth: ResearchDepth;
  manual_subtopics?: number;
  manual_max_iterations?: number;
  confirmed_outline?: OutlineItem[];
}

export interface ResearchConfigValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function createEmptyResearchConfig(): DeepResearchFormConfig {
  return { mode: "", depth: "" };
}

export function validateResearchConfig(
  cfg: DeepResearchFormConfig,
): ResearchConfigValidationResult {
  const errors: Record<string, string> = {};
  if (!cfg.mode) errors.mode = "Required";
  if (!cfg.depth) errors.depth = "Required";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function buildResearchWSConfig(
  cfg: DeepResearchFormConfig,
  confirmedOutline?: OutlineItem[],
): Record<string, unknown> {
  const validation = validateResearchConfig(cfg);
  if (!validation.valid) throw new Error("Deep research settings are incomplete.");
  const result: Record<string, unknown> = { mode: cfg.mode, depth: cfg.depth };
  if (cfg.depth === "manual") {
    if (cfg.manual_subtopics != null) result.manual_subtopics = cfg.manual_subtopics;
    if (cfg.manual_max_iterations != null)
      result.manual_max_iterations = cfg.manual_max_iterations;
  }
  const outline = confirmedOutline ?? cfg.confirmed_outline;
  if (outline && outline.length > 0) result.confirmed_outline = outline;
  return result;
}

// ─── Book Types ──────────────────────────────────────────────────────────────

export type BookStatus = "draft" | "spine_ready" | "compiling" | "ready" | "error" | "archived";
export type PageStatus = "pending" | "planning" | "generating" | "ready" | "partial" | "error";
export type BlockStatus = "pending" | "generating" | "ready" | "error" | "hidden";
export type BlockType =
  | "text" | "callout" | "quiz" | "user_note" | "figure" | "interactive"
  | "animation" | "code" | "timeline" | "flash_cards" | "deep_dive" | "section" | "concept_graph";
export type ContentType = "theory" | "derivation" | "history" | "practice" | "concept" | "overview";

export interface ConceptNode { id: string; label: string; chapter_id: string; description: string; weight: number; }
export interface ConceptEdge { src: string; dst: string; relation: "depends_on" | "extends" | "related" | string; rationale: string; }
export interface ConceptGraph { nodes: ConceptNode[]; edges: ConceptEdge[]; }
export interface SourceAnchor { kind: string; ref: string; snippet: string; }

export interface Block {
  id: string; type: BlockType; status: BlockStatus; title: string;
  params: Record<string, unknown>; payload: Record<string, unknown>;
  source_anchors: SourceAnchor[]; metadata: Record<string, unknown>;
  error: string; created_at: number; updated_at: number;
}

export interface Page {
  id: string; book_id: string; chapter_id: string; title: string;
  learning_objectives: string[]; content_type: ContentType; status: PageStatus;
  order: number; blocks: Block[];
  links: Array<{ target_page_id: string; relation: string; label: string }>;
  parent_page_id: string; error: string; created_at: number; updated_at: number;
}

export interface Chapter {
  id: string; title: string; learning_objectives: string[];
  content_type: ContentType; source_anchors: SourceAnchor[];
  prerequisites: string[]; page_ids: string[]; summary: string; order: number;
}

export interface Spine {
  book_id: string; chapters: Chapter[]; version: number; updated_at: number;
  concept_graph?: ConceptGraph; exploration_summary?: string;
}

export interface BookProposal {
  title: string; description: string; scope: string; target_level: string;
  estimated_chapters: number; rationale: string;
}

export interface Book {
  id: string; title: string; description: string; status: BookStatus;
  proposal: BookProposal | null; knowledge_bases: string[]; language: string;
  page_count: number; chapter_count: number; created_at: number; updated_at: number;
  metadata: Record<string, unknown> & { page_chat_sessions?: Record<string, string> };
}

export interface Progress {
  book_id: string; current_page_id: string; visited_page_ids: string[];
  bookmarked_page_ids: string[];
  quiz_attempts: Array<{ block_id: string; page_id: string; question_id: string; user_answer: string; is_correct: boolean; timestamp: number; }>;
  weak_chapters: string[]; score: number; updated_at: number;
}

export interface BookDetail { book: Book; spine: Spine | null; pages: Page[]; progress: Progress; }

// ─── Notebook Types ──────────────────────────────────────────────────────────

export interface Notebook { id: string; name: string; description: string; record_count: number; color: string; }
export interface NotebookRecord { id: string; title: string; summary?: string; user_query: string; output: string; type: string; }
export interface SelectedRecord extends NotebookRecord { notebookId: string; notebookName: string; }

// ─── Math Animator Types ─────────────────────────────────────────────────────

export type MathAnimatorOutputMode = "video" | "image";
export interface MathAnimatorArtifact { type: "video" | "image"; url: string; filename: string; content_type?: string; label?: string; }

export interface MathAnimatorResult {
  response: string; output_mode: MathAnimatorOutputMode;
  code: { language: string; content: string };
  artifacts: MathAnimatorArtifact[];
  timings: Record<string, number>;
  render: { quality?: string; retry_attempts?: number; retry_history?: Array<{ attempt: number; error: string }>; source_code_path?: string; visual_review?: { passed?: boolean; summary?: string; issues?: string[]; suggested_fix?: string; reviewed_frames?: number; } | null; };
  summary?: { summary_text?: string; user_request?: string; generated_output?: string; key_points?: string[]; };
}

export function extractMathAnimatorResult(
  resultMetadata: Record<string, unknown> | undefined,
): MathAnimatorResult | null {
  if (!resultMetadata) return null;
  const artifacts = Array.isArray(resultMetadata.artifacts)
    ? resultMetadata.artifacts.filter((item): item is MathAnimatorArtifact =>
        Boolean(item && typeof item === "object" && "type" in item && "url" in item && "filename" in item))
    : [];
  const codeRaw = resultMetadata.code && typeof resultMetadata.code === "object"
    ? (resultMetadata.code as Record<string, unknown>) : {};
  const hasOutputMode = resultMetadata.output_mode === "image" || resultMetadata.output_mode === "video";
  const timings = resultMetadata.timings && typeof resultMetadata.timings === "object"
    ? (resultMetadata.timings as Record<string, number>) : {};
  const render = resultMetadata.render && typeof resultMetadata.render === "object"
    ? (resultMetadata.render as MathAnimatorResult["render"]) : {};
  if (!artifacts.length && !codeRaw.content && !hasOutputMode &&
      Object.keys(timings).length === 0 && Object.keys(render).length === 0) return null;
  return {
    response: String(resultMetadata.response ?? ""),
    output_mode: resultMetadata.output_mode === "image" ? "image" : "video",
    code: { language: String(codeRaw.language ?? "python"), content: String(codeRaw.content ?? "") },
    artifacts, timings, render,
    summary: resultMetadata.summary && typeof resultMetadata.summary === "object"
      ? (resultMetadata.summary as MathAnimatorResult["summary"]) : undefined,
  };
}

// ─── Visualize Types ─────────────────────────────────────────────────────────

export type VisualizeTextRenderType = "svg" | "chartjs" | "mermaid" | "html";
export type VisualizeManimRenderType = "manim_video" | "manim_image";
export type VisualizeRenderType = VisualizeTextRenderType | VisualizeManimRenderType;
export type VisualizeRenderMode = "auto" | VisualizeRenderType;
export interface VisualizeFormConfig { render_mode: VisualizeRenderMode; quality: "low" | "medium" | "high"; style_hint: string; }
export const DEFAULT_VISUALIZE_CONFIG: VisualizeFormConfig = { render_mode: "auto", quality: "medium", style_hint: "" };
export function isManimRenderType(renderType: string): renderType is VisualizeManimRenderType {
  return renderType === "manim_video" || renderType === "manim_image";
}

interface VisualizeTextResult {
  response: string; render_type: VisualizeTextRenderType;
  code: { language: string; content: string };
  analysis: { render_type: string; description: string; data_description: string; chart_type: string; visual_elements: string[]; rationale: string; };
  review: { optimized_code: string; changed: boolean; review_notes: string };
}
interface VisualizeManimResult { render_type: VisualizeManimRenderType; manim: MathAnimatorResult; }
export type VisualizeResult = VisualizeTextResult | VisualizeManimResult;
export function isManimResult(result: VisualizeResult): result is VisualizeManimResult {
  return isManimRenderType(result.render_type);
}

// ─── Space Types ─────────────────────────────────────────────────────────────

export type SpaceItemKey = "chat_history" | "agents" | "notebooks" | "question_bank" | "personas" | "skills";
export type SpaceMemoryFile = "summary" | "profile";

/** Icon field intentionally omitted — injected per-platform using lucide-react / lucide-react-native. */
export interface SpaceItem { key: SpaceItemKey; href: string; label: string; description: string; }

export const SPACE_ITEMS: SpaceItem[] = [
  { key: "chat_history", href: "/space/chat-history", label: "Chat History", description: "Review and reopen previous conversations." },
  { key: "agents", href: "/space/agents", label: "My Agents", description: "Chat with imported Claude Code and Codex agents." },
  { key: "notebooks", href: "/space/notebooks", label: "Notebooks", description: "Organize saved outputs from chat, research, Co-Writer, and more." },
  { key: "question_bank", href: "/space/questions", label: "Question Bank", description: "Review and organize quiz questions across sessions." },
  { key: "personas", href: "/space/personas", label: "Personas", description: "Behavior presets you can apply per chat turn." },
  { key: "skills", href: "/space/skills", label: "Skills", description: "Capability playbooks the model reads on demand." },
];
