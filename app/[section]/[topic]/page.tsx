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
	return <TopicClient sectionId={params.section} topicId={params.topic} />;
}
