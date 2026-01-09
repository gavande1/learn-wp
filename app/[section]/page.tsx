import { getAllSections } from "@/lib/exam-data";
import SectionClient from "./SectionClient";

export function generateStaticParams() {
	return getAllSections().map((section) => ({
		section: section.id,
	}));
}

export default function SectionPage({ params }: { params: { section: string } }) {
	return <SectionClient sectionId={params.section} />;
}
