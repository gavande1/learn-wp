import { getAllTopics } from "@/lib/exam-data";
import TopicClient from "./TopicClient";

export function generateStaticParams() {
	const allTopics = getAllTopics();
	return allTopics.map((topic) => ({
		section: topic.sectionId,
		topic: topic.topicId,
	}));
}

export default function TopicPage({ params }: { params: { section: string; topic: string } }) {
	// Ensure params are defined and provide fallbacks
	const sectionId = params?.section || "";
	const topicId = params?.topic || "";
	
	if (!sectionId || !topicId) {
		return (
			<div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Invalid Route</h1>
					<p className="text-[var(--foreground-muted)]">Section or topic parameter is missing.</p>
				</div>
			</div>
		);
	}
	
	return <TopicClient sectionId={sectionId} topicId={topicId} />;
}
