"""Built-in capability class paths."""

BUILTIN_CAPABILITY_CLASSES: dict[str, str] = {
    "chat": "edux.agents.chat.capability:ChatCapability",
    "deep_solve": "edux.capabilities.solve.capability:DeepSolveCapability",
    "deep_question": "edux.agents.question.capability:DeepQuestionCapability",
    "deep_research": "edux.agents.research.capability:DeepResearchCapability",
    "math_animator": "edux.agents.math_animator.capability:MathAnimatorCapability",
    "visualize": "edux.agents.visualize.capability:VisualizeCapability",
    "mastery_path": "edux.capabilities.mastery.capability:MasteryPathCapability",
}
