import type { ResumeBuilderContent } from "@/features/resume/types/resume.types";
import { Field, SectionHeader } from "./section.helpers";
import styles from "../ResumeEditor.module.css";
interface Props { content: ResumeBuilderContent; onChange: <K extends keyof ResumeBuilderContent>(key: K, value: ResumeBuilderContent[K]) => void; }
const SummarySection = ({ content, onChange }: Props) => (
  <><SectionHeader eyebrow="Hồ sơ nghề nghiệp" title="Giới thiệu nghề nghiệp" description="Tóm tắt ngắn về kinh nghiệm, thế mạnh và định hướng. Nội dung nên phù hợp với vai trò đang ứng tuyển nhưng không phụ thuộc vào một ngành cụ thể." />
  <div className={styles.sectionBody}><div className={styles.formSectionCard}><Field label="Tóm tắt" hint={`${content.summary.length}/700 ký tự`}><textarea rows={9} maxLength={700} value={content.summary} onChange={(e) => onChange("summary", e.target.value)} placeholder="Ví dụ: Có kinh nghiệm trong lĩnh vực..., thế mạnh về..., từng đạt kết quả..., hiện tìm kiếm cơ hội..." /></Field><div className={styles.guidanceGrid}><div><strong>1. Bạn là ai?</strong><span>Vai trò, số năm kinh nghiệm hoặc bối cảnh hiện tại.</span></div><div><strong>2. Bạn mạnh gì?</strong><span>2–3 năng lực liên quan nhất.</span></div><div><strong>3. Kết quả nào đáng chú ý?</strong><span>Thành tích có số liệu hoặc tác động cụ thể.</span></div><div><strong>4. Bạn đang tìm gì?</strong><span>Hướng phát triển hoặc loại cơ hội phù hợp.</span></div></div></div></div></>
);
export default SummarySection;
