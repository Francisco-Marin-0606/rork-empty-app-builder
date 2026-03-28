


export interface Question {
  options: string[];
  type?: string;
  question: string;
  description: string;
  header?: string;
  referenceQuestion?: string;
  templateHandler?: boolean;
  customizable?: boolean;
}

export interface GenderImage {
  base: string;
  male: string;
  female: string;
  femaleGray?: string;
  maleGray?: string;
}

export interface GenderTitle {
  base: string;
  male: string;
  female: string;
}

export interface GenderAudioDescription {
  base: string;
  male: string;
  female: string;
}

export interface FormSettings {
  backgroundColor: string;
  imagePlayer?: string;
  genderImage?: GenderImage;
  genderTitle?: GenderTitle;
  genderAudioDescription?: GenderAudioDescription;
}

export interface AppSettings {
  questions: Question[];
  _v: number;
  questionsFemale: Question[];
  questionsMale: Question[];
  formSettings: FormSettings;
}

export interface Preprocessor {
  preprocessorAssistant: string;
}

export interface LabSection {
  assistant: string;
  questions: number[];
  preprocessors: Preprocessor[];
  shouldBeMoreOrEqualTo?: number;
}

export interface AnalysisSettings {
  assistant: string;
  questions: number[];
  enabled: boolean;
}

export interface LabSettings {
  sections: LabSection[];
  _v: number;
  frontAnalysis?: AnalysisSettings;
  fullAnalysis?: AnalysisSettings;
}

export interface ExportSection {
  timeStart: number;
  timeEnd: number;
}

export interface ExportSettings {
  sections: ExportSection[];
  audioImg: string;
  _v: number;
}

export interface GenerativeFormSettings {
  assistant: string;
}

export interface TemplateSettings {
  templates: string;
}

export interface RequestSettings {
  _id: string;
  year: string;
  month: string;
  generativeFormSettings?: GenerativeFormSettings;
  labSettings: LabSettings;
  exportSettings: ExportSettings;
  appSettings: AppSettings;
  templateSettings?: TemplateSettings;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  userLevel?: string;
  customization?: Customization;
}

export interface PostHypnosisCustomization {
  assistant: string;
  genderImage: GenderImage;
}

export interface FrontAnalysisCustomization {
  assistant: string;
  questions: number[];
  enabled: boolean;
}

export interface Customization {
  postHypnosis?: PostHypnosisCustomization;
  frontAnalysis?: FrontAnalysisCustomization;
}
