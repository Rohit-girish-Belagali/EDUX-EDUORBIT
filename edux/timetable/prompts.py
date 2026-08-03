"""LLM prompt for turning raw syllabus text into a subject/chapter/topic tree."""

from __future__ import annotations

_SYSTEM_EN = (
    "You are an expert curriculum analyst. You read a raw syllabus document "
    "(possibly messy OCR/export text) and extract its structure as strict JSON. "
    "Never invent content that isn't implied by the source text; if the "
    "syllabus only lists chapters without explicit topics, break each chapter "
    "into 2-6 reasonable topics yourself based on its title."
)

_SYSTEM_ZH = (
    "你是一名课程大纲分析专家。你会阅读一份原始教学大纲文本（可能包含 OCR 或导出格式的噪音），"
    "并将其结构提取为严格的 JSON。不要凭空编造原文没有暗示的内容；如果大纲只列出章节而没有具体主题，"
    "请根据章节标题自行合理拆分为 2-6 个主题。"
)

_USER_TEMPLATE_EN = """\
Extract the subject / chapter / topic structure from the syllabus text below.

Return ONLY JSON matching this shape, no prose, no markdown fences:
{{
  "subjects": [
    {{
      "name": "string",
      "chapters": [
        {{
          "name": "string",
          "topics": [
            {{"name": "string", "difficulty": 1}}
          ]
        }}
      ]
    }}
  ]
}}

Rules:
- "difficulty" is an integer 1 (easy/quick recap), 2 (typical), or 3 (hard/dense) — estimate it from how conceptually deep or exam-heavy the topic sounds.
- If the syllabus covers a single subject, return one entry in "subjects".
- If the syllabus text mentions multiple distinct courses/subjects, split them into separate entries.
- Keep names concise (a few words), drawn from the source text where possible.
- Preserve the original ordering of chapters and topics.

Syllabus text:
---
{syllabus_text}
---
"""

_USER_TEMPLATE_ZH = """\
请从以下教学大纲文本中提取"学科 / 章节 / 主题"结构。

只返回符合以下格式的 JSON，不要任何说明文字，也不要 markdown 代码块：
{{
  "subjects": [
    {{
      "name": "字符串",
      "chapters": [
        {{
          "name": "字符串",
          "topics": [
            {{"name": "字符串", "difficulty": 1}}
          ]
        }}
      ]
    }}
  ]
}}

规则：
- "difficulty" 为整数，1（简单/快速复习）、2（一般）、3（困难/内容密集）——根据主题的概念深度或考试重要程度估算。
- 如果大纲只涉及一门学科，"subjects" 中只返回一项。
- 如果大纲文本中提到多门不同的课程/学科，请将它们拆分为多个条目。
- 名称保持简洁（几个词以内），尽量取自原文。
- 保持章节和主题的原始顺序。

大纲文本：
---
{syllabus_text}
---
"""


def syllabus_extraction_prompts(language: str, syllabus_text: str) -> tuple[str, str]:
    is_zh = str(language).lower().startswith("zh")
    system_prompt = _SYSTEM_ZH if is_zh else _SYSTEM_EN
    user_template = _USER_TEMPLATE_ZH if is_zh else _USER_TEMPLATE_EN
    return system_prompt, user_template.format(syllabus_text=syllabus_text)


__all__ = ["syllabus_extraction_prompts"]
