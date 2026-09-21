import { RESUME_TEMPLATES } from "@/features/resume/builder/data/resumeTemplates";
import type { ResumeTemplateCode } from "@/features/resume/types/resume.types";
import styles from "./ResumeEditor.module.css";
interface Props{value:ResumeTemplateCode;onChange:(value:ResumeTemplateCode)=>void}
const ResumeTemplatePicker=({value,onChange}:Props)=>(<div className={styles.templateGrid}>{RESUME_TEMPLATES.map((template)=><button key={template.code} type="button" className={`${styles.templateCard} ${value===template.code?styles.templateCardActive:""}`} onClick={()=>onChange(template.code)}><TemplateThumb code={template.code}/><div className={styles.templateCardBody}><div className={styles.templateTitleRow}><strong>{template.name}</strong><span>{template.badge}</span></div><p>{template.description}</p><small>{template.bestFor}</small></div></button>)}</div>);
const TemplateThumb=({code}:{code:ResumeTemplateCode})=><div className={`${styles.templateThumb} ${styles[`templateThumb_${code}`]}`}><div className={styles.thumbHeader}><b/><i/></div><div className={styles.thumbBody}><span/><span/><strong/><span/><span/></div><div className={styles.thumbSide}><span/><span/><span/></div></div>;
export default ResumeTemplatePicker;
