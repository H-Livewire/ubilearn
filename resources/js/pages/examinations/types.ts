export interface Paper {
   has_pdf: boolean;
   has_marking: boolean;
   has_instructions: boolean;
   id: number;
   title: string;
   education: string;
   class_name: string | null;
   region: string | null;
   subject: string | null;
   year: number | null;
   exam_type: string | null;
   organizer: string | null;
   source_name: string | null;
   source_url: string | null;
   pdf_url: string | null;
   answer_url: string | null;
   has_answers: boolean;
   published: boolean;
}
export interface Options {
   classes?: Record<string, Record<string, string>>;
   education: Record<string, string>;
   regions: string[];
   types: string[];
}
export interface Page<T> {
   current_page?: number;
   data: T[];
   total: number;
   links: { url: string | null; label: string; active: boolean }[];
}
