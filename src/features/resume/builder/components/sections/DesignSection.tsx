import {
  RESUME_ACCENT_OPTIONS,
  RESUME_INDUSTRY_PRESETS,
  RESUME_SECTION_LABELS,
} from "@/features/resume/builder/data/resumeTemplates";
import type {
  ResumeBuilderSettings,
  ResumeIndustryPreset,
  ResumeSectionId,
  ResumeTemplateCode,
} from "@/features/resume/types/resume.types";
import ResumeTemplatePicker from "../ResumeTemplatePicker";
import { SectionHeader } from "./section.helpers";
import styles from "../ResumeEditor.module.css";
interface Props {
  templateCode: ResumeTemplateCode;
  settings: ResumeBuilderSettings;
  onTemplateChange: (value: ResumeTemplateCode) => void;
  onSettingsChange: <K extends keyof ResumeBuilderSettings>(key: K, value: ResumeBuilderSettings[K]) => void;
  onApplyIndustryPreset: (value: ResumeIndustryPreset) => void;
  onToggleSectionVisibility: (sectionId: ResumeSectionId) => void;
  onMoveSection: (sectionId: ResumeSectionId, direction: -1 | 1) => void;
}
const DesignSection = ({ templateCode, settings, onTemplateChange, onSettingsChange, onApplyIndustryPreset, onToggleSectionVisibility, onMoveSection }: Props) => (
  <><SectionHeader eyebrow="Hoàn thiện" title="Mẫu & thiết kế" description="Chọn khung CV theo phong cách trình bày, không theo một ngành cố định. Dữ liệu của bạn được giữ nguyên khi đổi mẫu." />
  <div className={styles.sectionBody}>
    <div className={styles.formSectionCard}><div className={styles.formSectionHeading}><div><strong>Gợi ý bố cục theo nhóm nghề</strong><p>Chỉ thay đổi thứ tự ưu tiên section, không xóa dữ liệu và không ép mẫu theo ngành.</p></div></div><label className={styles.selectField}><span>Nhóm nghề</span><select value={settings.industryPreset} onChange={(e)=>onApplyIndustryPreset(e.target.value as ResumeIndustryPreset)}>{RESUME_INDUSTRY_PRESETS.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label></div>
    <div className={styles.formSectionCard}><div className={styles.formSectionHeading}><div><strong>Khung CV</strong><p>5 bố cục có cấu trúc thật sự khác nhau.</p></div></div><ResumeTemplatePicker value={templateCode} onChange={onTemplateChange}/></div>
    <div className={styles.formSectionCard}><div className={styles.formSectionHeading}><div><strong>Phong cách hiển thị</strong><p>Tinh chỉnh màu, chữ và mật độ nội dung.</p></div></div><div className={styles.colorOptions}>{RESUME_ACCENT_OPTIONS.map((option)=><button key={option.value} type="button" className={settings.accentColor===option.value?styles.colorOptionActive:""} onClick={()=>onSettingsChange("accentColor",option.value)}><span style={{background:option.color}}/>{option.label}</button>)}</div><div className={styles.twoColumns}><label className={styles.selectField}><span>Font</span><select value={settings.fontFamily} onChange={(e)=>onSettingsChange("fontFamily",e.target.value as ResumeBuilderSettings["fontFamily"])}><option value="sans">Sans hiện đại</option><option value="humanist">Humanist dễ đọc</option><option value="serif">Serif trang trọng</option></select></label><label className={styles.selectField}><span>Độ thoáng</span><select value={settings.density} onChange={(e)=>onSettingsChange("density",e.target.value as ResumeBuilderSettings["density"])}><option value="compact">Gọn</option><option value="balanced">Cân bằng</option><option value="spacious">Thoáng</option></select></label></div><label className={styles.switchRow}><div><strong>Hiển thị ảnh</strong><span>Chỉ bật khi phù hợp với vai trò, thị trường và mẫu đang dùng.</span></div><input type="checkbox" checked={settings.showPhoto} onChange={(e)=>onSettingsChange("showPhoto",e.target.checked)}/></label></div>
    <div className={styles.formSectionCard}><div className={styles.formSectionHeading}><div><strong>Thứ tự & hiển thị nội dung</strong><p>Ẩn section không phù hợp và đưa phần quan trọng lên trước.</p></div></div><div className={styles.sectionOrderList}>{settings.sectionOrder.map((sectionId,index)=>{const hidden=settings.hiddenSections.includes(sectionId);return <div className={styles.sectionOrderRow} key={sectionId}><span className={styles.dragIndex}>{String(index+1).padStart(2,"0")}</span><strong>{RESUME_SECTION_LABELS[sectionId]}</strong><div className={styles.orderActions}><button type="button" disabled={index===0} onClick={()=>onMoveSection(sectionId,-1)} aria-label="Đưa lên">↑</button><button type="button" disabled={index===settings.sectionOrder.length-1} onClick={()=>onMoveSection(sectionId,1)} aria-label="Đưa xuống">↓</button><button type="button" className={hidden?styles.visibilityOff:""} onClick={()=>onToggleSectionVisibility(sectionId)}>{hidden?"Đang ẩn":"Hiển thị"}</button></div></div>})}</div></div>
  </div></>
);
export default DesignSection;
