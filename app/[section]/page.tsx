import { getAllSections } from "@/lib/exam-data";
import SectionClient from "./SectionClient";

export function generateStaticParams() {
	return getAllSections().map((section) => ({
		section: section.id,
	}));
}

export default function SectionPage({ params }: { params: { section: string } }) {
	// Params should be available, but if not, SectionClient will read from URL
	return <SectionClient />;
}
