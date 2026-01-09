export interface TopicMeta {
	id: string;
	title: string;
}

export interface Section {
	id: string;
	title: string;
	percentage: number;
	description: string;
	topics: TopicMeta[];
}

export interface ExamData {
	sections: Section[];
}

export interface SectionProgress {
	completed: number;
	total: number;
	percentage: number;
}

export interface OverallProgress {
	totalCompleted: number;
	totalTopics: number;
	percentage: number;
	sections: Record<string, SectionProgress>;
}
