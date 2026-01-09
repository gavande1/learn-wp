import { ExamData, Section } from "@/types/exam";

export const examData: ExamData = {
	sections: [
		{
			id: "wordpress-core",
			title: "WordPress Core",
			percentage: 15,
			description: "Deep understanding of WordPress core functionality including hooks, APIs, and core systems.",
			topics: [
				{ id: "hooks-actions-filters", title: "Hooks (Actions and Filters)" },
				{ id: "rest-api", title: "Core REST API Usage and Customization" },
				{ id: "options-api", title: "Options API" },
				{ id: "transients-api", title: "Transients API" },
				{ id: "cron-event-api", title: "Cron / Event API" },
				{ id: "settings-api", title: "Settings API" },
				{ id: "template-hierarchy", title: "Template Hierarchy" },
				{ id: "permalinks-rewrite", title: "Permalinks and Rewrite Rules" },
				{ id: "multisite", title: "Multisite" },
				{ id: "roles-capabilities", title: "Roles and Capabilities" },
				{ id: "wp-query", title: "WP_Query" },
				{ id: "taxonomies", title: "Taxonomies" },
				{ id: "post-meta", title: "Post Meta" },
				{ id: "block-editor-architecture", title: "Block Editor Basic Architecture" },
				{ id: "custom-post-types", title: "Custom Post Types (CPTs)" },
				{ id: "media-library", title: "Media Library" },
				{ id: "interactivity-api", title: "Interactivity API" },
			],
		},
		{
			id: "custom-development",
			title: "Custom Development",
			percentage: 15,
			description: "Building custom WordPress solutions including blocks, themes, and plugins following best practices.",
			topics: [
				{ id: "block-editor", title: "Block Editor" },
				{ id: "internationalization", title: "Internationalization (i18n)" },
				{ id: "dependencies", title: "Dependencies in WordPress Code" },
				{ id: "wordpress-standards", title: "WordPress Standards" },
				{ id: "code-organization", title: "Code Organization" },
				{ id: "activation-deactivation", title: "Activation and Deactivation" },
				{ id: "hook-use-loading", title: "Correct Hook Use for Loading Plugin Code" },
				{ id: "execution-context", title: "Running Code in the Correct Context" },
				{ id: "php-sessions-caching", title: "PHP Sessions and Caching Issues" },
			],
		},
		{
			id: "security",
			title: "Security",
			percentage: 15,
			description: "Implementing security best practices to protect WordPress installations from vulnerabilities.",
			topics: [
				{ id: "data-sanitization", title: "Data Sanitization" },
				{ id: "data-validation", title: "Data Validation" },
				{ id: "data-escaping", title: "Data Escaping" },
				{ id: "nonces", title: "Nonces" },
				{ id: "capability-checks", title: "Capability Checks" },
				{ id: "sql-injection", title: "SQL Injection Prevention" },
				{ id: "xss-prevention", title: "XSS Prevention" },
				{ id: "csrf-protection", title: "CSRF Protection" },
				{ id: "authentication", title: "Authentication" },
				{ id: "authorization", title: "Authorization" },
				{ id: "secure-apis", title: "Secure APIs" },
				{ id: "file-security", title: "File Security" },
			],
		},
		{
			id: "performance",
			title: "Performance",
			percentage: 15,
			description: "Optimizing WordPress for speed, scalability, and efficient resource usage.",
			topics: [
				{ id: "query-optimization", title: "Query Optimization" },
				{ id: "caching-strategies", title: "Caching Strategies" },
				{ id: "object-cache", title: "Object Cache" },
				{ id: "database-optimization", title: "Database Optimization" },
				{ id: "asset-optimization", title: "Asset Optimization" },
				{ id: "lazy-loading", title: "Lazy Loading" },
				{ id: "cdn-integration", title: "CDN Integration" },
			],
		},
		{
			id: "testing-quality",
			title: "Testing & Quality Assurance",
			percentage: 10,
			description: "Writing and maintaining tests to ensure code quality and reliability.",
			topics: [
				{ id: "unit-testing", title: "Unit Testing" },
				{ id: "integration-testing", title: "Integration Testing" },
				{ id: "e2e-testing", title: "End-to-End Testing" },
				{ id: "test-coverage", title: "Test Coverage" },
			],
		},
		{
			id: "debugging-troubleshooting",
			title: "Debugging & Troubleshooting",
			percentage: 10,
			description: "Diagnosing and resolving issues in WordPress installations.",
			topics: [
				{ id: "debugging-basics", title: "Debugging Basics" },
				{ id: "error-logging", title: "Error Logging" },
				{ id: "query-monitor", title: "Query Monitor" },
				{ id: "debug-bar", title: "Debug Bar" },
				{ id: "wp-debug", title: "WP_DEBUG" },
			],
		},
		{
			id: "scalability-architecture",
			title: "Scalability & Architecture",
			percentage: 10,
			description: "Designing WordPress solutions that scale with traffic and data growth.",
			topics: [
				{ id: "scaling-strategies", title: "Scaling Strategies" },
				{ id: "load-balancing", title: "Load Balancing" },
				{ id: "database-scaling", title: "Database Scaling" },
				{ id: "caching-architecture", title: "Caching Architecture" },
			],
		},
		{
			id: "disaster-recovery",
			title: "Disaster Recovery",
			percentage: 10,
			description: "Planning and implementing backup and recovery strategies.",
			topics: [
				{ id: "backup-strategies", title: "Backup Strategies" },
				{ id: "restore-procedures", title: "Restore Procedures" },
				{ id: "data-recovery", title: "Data Recovery" },
			],
		},
	],
};

export function getSectionById(sectionId: string): Section | undefined {
	return examData.sections.find((s) => s.id === sectionId);
}

export function getTopicByIds(sectionId: string, topicId: string) {
	const section = getSectionById(sectionId);
	return section?.topics.find((t) => t.id === topicId);
}

export function getAllTopics(): Array<{ sectionId: string; topicId: string; title: string }> {
	const topics: Array<{ sectionId: string; topicId: string; title: string }> = [];
	examData.sections.forEach((section) => {
		section.topics.forEach((topic) => {
			topics.push({
				sectionId: section.id,
				topicId: topic.id,
				title: topic.title,
			});
		});
	});
	return topics;
}

export function getTotalTopics(): number {
	return examData.sections.reduce((acc, section) => acc + section.topics.length, 0);
}

export function getNextTopic(sectionId: string, topicId: string): { sectionId: string; topicId: string } | null {
	const allTopics = getAllTopics();
	const currentIndex = allTopics.findIndex((t) => t.sectionId === sectionId && t.topicId === topicId);
	if (currentIndex === -1 || currentIndex === allTopics.length - 1) return null;
	return allTopics[currentIndex + 1];
}

export function getPrevTopic(sectionId: string, topicId: string): { sectionId: string; topicId: string } | null {
	const allTopics = getAllTopics();
	const currentIndex = allTopics.findIndex((t) => t.sectionId === sectionId && t.topicId === topicId);
	if (currentIndex <= 0) return null;
	return allTopics[currentIndex - 1];
}
