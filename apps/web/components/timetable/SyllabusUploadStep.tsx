"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";

import { extractSyllabus, type SyllabusSubject } from "@/lib/timetable-api";
import TimetableGeneratingAnimation from "./TimetableGeneratingAnimation";

const ACCEPT = ".pdf,.docx,.pptx,.txt,.md";

export default function SyllabusUploadStep({
  tr,
  onExtracted,
}: {
  tr: (cn: string, en: string) => string;
  onExtracted: (subjects: SyllabusSubject[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);
      try {
        const result = await extractSyllabus(file);
        onExtracted(result.subjects);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [onExtracted],
  );

  if (loading) {
    return (
      <TimetableGeneratingAnimation
        messages={[
          tr("正在阅读大纲…", "Reading your syllabus…"),
          tr("正在识别学科与章节…", "Identifying subjects and chapters…"),
          tr("正在整理主题结构…", "Structuring the topics…"),
        ]}
      />
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h2 className="text-[17px] font-semibold text-[var(--foreground)]">
        {tr("上传教学大纲", "Upload your syllabus")}
      </h2>
      <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
        {tr(
          "支持 PDF、Word、PPT 或纯文本。我们会自动识别学科、章节与主题。",
          "PDF, Word, PPT, or plain text. We'll automatically identify subjects, chapters, and topics.",
        )}
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-16 text-center transition-colors ${
          dragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--accent)]"
        }`}
      >
        <Upload size={28} strokeWidth={1.5} className="text-[var(--muted-foreground)]" />
        <div>
          <p className="text-[13.5px] font-medium text-[var(--foreground)]">
            {tr("拖拽文件到此处，或点击选择", "Drag a file here, or click to browse")}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-[11.5px] text-[var(--muted-foreground)]">
            <FileText size={12} /> {ACCEPT.replaceAll(",", "  ·  ")}
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-3 text-[12.5px] text-[var(--destructive)]">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
