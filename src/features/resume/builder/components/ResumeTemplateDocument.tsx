import type { ReactNode } from "react";
import { RESUME_SECTION_LABELS } from "@/features/resume/builder/data/resumeTemplates";
import type {
  ResumeBuilderContent,
  ResumeBuilderSettings,
  ResumeSectionId,
  ResumeTemplateCode,
} from "@/features/resume/types/resume.types";
import styles from "./ResumePreview.module.css";

interface Props { content: ResumeBuilderContent; settings: ResumeBuilderSettings; templateCode: ResumeTemplateCode; }

const ResumeTemplateDocument = ({ content, settings, templateCode }: Props) => {
  const className = [styles.document, styles[`font_${settings.fontFamily}`], styles[`density_${settings.density}`], styles[`accent_${settings.accentColor}`], styles[templateCode]].join(" ");
  const visible = settings.sectionOrder.filter((id) => !settings.hiddenSections.includes(id));
  const sidebarIds: ResumeSectionId[] = ["skills", "languages", "certifications", "references"];
  const mainIds = visible.filter((id) => !sidebarIds.includes(id));
  const sideIds = visible.filter((id) => sidebarIds.includes(id));

  if (templateCode === "modern") {
    return <article className={className}><aside className={styles.modernSidebar}>{settings.showPhoto && <Photo content={content}/>}<Contact content={content} stacked/><Links content={content}/>{sideIds.map((id)=><Section key={id} id={id} content={content} compact/>)}</aside><main className={styles.modernMain}><Header content={content} variant="modern"/>{mainIds.map((id)=><Section key={id} id={id} content={content}/>)}</main></article>;
  }

  if (templateCode === "corporate") {
    return <article className={className}><header className={styles.corporateHeader}><Header content={content} variant="corporate"/><Contact content={content}/><Links content={content}/></header><div className={styles.corporateBody}><main>{mainIds.map((id)=><Section key={id} id={id} content={content}/>)}</main><aside className={styles.corporateSide}>{settings.showPhoto && <Photo content={content}/>} {sideIds.map((id)=><Section key={id} id={id} content={content} compact/>)}</aside></div></article>;
  }

  if (templateCode === "creative") {
    return <article className={className}><div className={styles.creativeRail}/><main className={styles.creativeBody}><header className={styles.creativeHeader}>{settings.showPhoto && <Photo content={content}/>}<div><Header content={content} variant="creative"/><Contact content={content}/><Links content={content}/></div></header>{visible.map((id)=><Section key={id} id={id} content={content}/>)}</main></article>;
  }

  if (templateCode === "minimal") {
    return <article className={className}><header className={styles.minimalHeader}>{settings.showPhoto && <Photo content={content}/>}<Header content={content} variant="minimal"/><Contact content={content}/><Links content={content}/></header>{visible.map((id)=><Section key={id} id={id} content={content}/>)}</article>;
  }

  return <article className={className}><header className={styles.classicHeader}><div><Header content={content} variant="classic"/><Contact content={content}/><Links content={content}/></div>{settings.showPhoto && <Photo content={content}/>}</header><main className={styles.classicMain}>{visible.map((id)=><Section key={id} id={id} content={content}/>)}</main></article>;
};

const Header = ({ content, variant }: { content: ResumeBuilderContent; variant: string }) => <div data-variant={variant}><h1 className={styles.headerName}>{content.fullName || "Họ và tên"}</h1><p className={styles.headerTitle}>{content.professionalTitle || "Chức danh / vị trí mục tiêu"}</p></div>;
const Photo = ({ content }: { content: ResumeBuilderContent }) => content.photoDataUrl ? <img className={styles.profilePhoto} src={content.photoDataUrl} alt=""/> : <div className={styles.placeholderPhoto}>{initials(content.fullName)}</div>;
const Contact = ({ content, stacked=false }: { content: ResumeBuilderContent; stacked?: boolean }) => {
  const items=[content.email,content.phone,content.location].filter(Boolean);
  return items.length ? <div className={stacked?styles.compactList:styles.contactLine}>{items.map((item,index)=>stacked?<div key={`${item}-${index}`}><strong>{index===0?"Email":index===1?"Điện thoại":"Khu vực"}</strong><span>{item}</span></div>:<span key={`${item}-${index}`}>{item}</span>)}</div> : <div className={styles.contactLine}><span>Email · Điện thoại · Khu vực</span></div>;
};
const Links = ({ content }: { content: ResumeBuilderContent }) => content.links.length ? <div className={styles.links}>{content.links.filter((item)=>item.label||item.url).map((item)=><span key={item.id}>{item.label ? `${item.label}: ` : ""}{cleanLink(item.url)}</span>)}</div> : null;

const Section = ({ id, content, compact=false }: { id: ResumeSectionId; content: ResumeBuilderContent; compact?: boolean }) => {
  const body = renderBody(id, content, compact);
  if (!body) return null;
  return <section className={styles.docSection}><h2 className={styles.sectionTitle}>{RESUME_SECTION_LABELS[id]}</h2><div className={styles.sectionRule}/>{body}</section>;
};

const renderBody = (id: ResumeSectionId, c: ResumeBuilderContent, compact: boolean): ReactNode => {
  switch(id){
    case "summary": return c.summary ? <p className={styles.summaryText}>{c.summary}</p> : <p className={styles.emptyHint}>Tóm tắt nghề nghiệp sẽ hiển thị tại đây.</p>;
    case "experience": return c.experience.length ? <>{c.experience.map((item)=><Entry key={item.id} title={item.position||"Vị trí"} subtitle={item.company} meta={[item.location,item.employmentType,formatPeriod(item.startDate,item.isCurrent?"Hiện tại":item.endDate)].filter(Boolean).join(" · ")} bullets={item.highlights}/>)}</> : <p className={styles.emptyHint}>Kinh nghiệm làm việc sẽ hiển thị tại đây.</p>;
    case "education": return c.education.length ? <>{c.education.map((item)=><Entry key={item.id} title={item.school||"Cơ sở đào tạo"} subtitle={[item.degree,item.major].filter(Boolean).join(" · ")} meta={[item.location,formatPeriod(item.startYear,item.isStudying?"Hiện tại":item.endYear),item.gpa?`GPA / Xếp loại: ${item.gpa}`:""].filter(Boolean).join(" · ")} bullets={item.highlights}/>)}</> : <p className={styles.emptyHint}>Học vấn sẽ hiển thị tại đây.</p>;
    case "skills": return c.skills.length ? <div className={styles.skillRows}>{c.skills.map((group)=><div className={styles.skillRow} key={group.id}><strong>{group.name||"Kỹ năng"}</strong><span>{group.skills.join(" · ")||"Chưa có kỹ năng"}</span></div>)}</div> : <p className={styles.emptyHint}>Kỹ năng sẽ hiển thị tại đây.</p>;
    case "languages": return c.languages.length ? <div className={styles.compactList}>{c.languages.map((item)=><div key={item.id}><strong>{item.name||"Ngoại ngữ"}</strong><span>{[item.level,item.certificate].filter(Boolean).join(" · ")}</span></div>)}</div> : null;
    case "certifications": return c.certifications.length ? <div className={styles.compactList}>{c.certifications.map((item)=><div key={item.id}><strong>{item.name||"Chứng chỉ"}</strong><span>{[item.issuer,formatMonth(item.issueDate),item.credentialId].filter(Boolean).join(" · ")}</span></div>)}</div> : null;
    case "projects": return c.projects.length ? <>{c.projects.map((item)=><Entry key={item.id} title={item.name||"Dự án / công việc"} subtitle={[item.role,item.organization].filter(Boolean).join(" · ")} meta={[formatPeriod(item.startDate,item.endDate),item.link?cleanLink(item.link):""].filter(Boolean).join(" · ")} bullets={item.highlights} tags={item.tags}/>)}</> : null;
    case "awards": return c.awards.length ? <>{c.awards.map((item)=><Entry key={item.id} title={item.title||"Thành tích"} subtitle={item.issuer} meta={formatMonth(item.date)} text={item.description}/>)}</> : null;
    case "activities": return c.activities.length ? <>{c.activities.map((item)=><Entry key={item.id} title={item.name||"Hoạt động"} subtitle={[item.role,item.organization].filter(Boolean).join(" · ")} meta={formatPeriod(item.startDate,item.endDate)} text={item.description}/>)}</> : null;
    case "volunteering": return c.volunteering.length ? <>{c.volunteering.map((item)=><Entry key={item.id} title={item.role||"Vai trò"} subtitle={item.organization} meta={[item.location,formatPeriod(item.startDate,item.endDate)].filter(Boolean).join(" · ")} text={item.description}/>)}</> : null;
    case "references": return c.references.length ? <div className={styles.compactList}>{c.references.map((item)=><div key={item.id}><strong>{item.name||"Người tham chiếu"}</strong><span>{[item.position,item.organization,item.email,item.phone].filter(Boolean).join(" · ")}</span>{item.note&&<span>{item.note}</span>}</div>)}</div> : null;
    case "custom": return c.customSections.length ? <>{c.customSections.map((section)=><div key={section.id}><h3 className={styles.entrySub}>{section.title}</h3>{section.items.map((item)=><Entry key={item.id} title={item.title||"Nội dung"} subtitle={item.subtitle} meta={item.period} text={item.description}/>)}</div>)}</> : null;
    default: return compact ? null : null;
  }
};

const Entry=({title,subtitle,meta,bullets=[],tags=[],text}:{title:string;subtitle?:string;meta?:string;bullets?:string[];tags?:string[];text?:string})=><div className={styles.entry}><div className={styles.entryHeader}><strong>{title}</strong>{meta&&<span>{meta}</span>}</div>{subtitle&&<div className={styles.entrySub}>{subtitle}</div>}{text&&<p className={styles.bodyText}>{text}</p>}{tags.length>0&&<div className={styles.tagList}>{tags.map((tag)=><span className={styles.tag} key={tag}>{tag}</span>)}</div>}{bullets.length>0&&<ul className={styles.bullets}>{bullets.map((line,index)=><li key={`${line}-${index}`}>{line}</li>)}</ul>}</div>;
const cleanLink=(value:string)=>value.replace(/^https?:\/\//i,"").replace(/\/$/,"");
const initials=(name:string)=>name.trim().split(/\s+/).filter(Boolean).slice(-2).map((part)=>part[0]).join("").toUpperCase()||"CV";
const formatPeriod=(start:string,end:string)=>[formatMonth(start),formatMonth(end)].filter(Boolean).join(" – ");
const formatMonth=(value:string)=>{if(!value)return"";if(/^\d{4}$/.test(value))return value;const match=/^(\d{4})-(\d{2})$/.exec(value);return match?`${match[2]}/${match[1]}`:value;};

export default ResumeTemplateDocument;
