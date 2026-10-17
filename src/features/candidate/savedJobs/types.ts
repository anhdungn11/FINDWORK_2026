export interface SavedJobItem {
  id: string | number;
  title: string;
  company: string;
  location: string;
  salary: string;
  workplace?: string;
  type?: string;
  savedAt: string;
  isMock?: boolean;
}
