"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import TopicCard from "@/components/TopicCard";
import { getSectionById } from "@/lib/exam-data";
import { getSectionProgress } from "@/lib/progress";
import { Section, SectionProgress } from "@/types/exam";
import { ArrowLeft, BookOpen, Target } from "lucide-react";

export default function SectionClient() {
	// Read params from URL using useParams hook (works with static export)
	const params = useParams();
	const sectionId = (params?.section as string) || "";
	
	// Initialize data synchronously to avoid loading state
	const sectionData = sectionId ? (getSectionById(sectionId) || null) : null;
	const sectionProgress = sectionId ? getSectionProgress(sectionId) : { completed: 0, total: 0, percentage: 0 };
	
	const [section, setSection] = useState<Section | null>(sectionData);
	const [progress, setProgress] = useState<SectionProgress>(sectionProgress);

	useEffect(() => {
		// Update if sectionId changes
		const newSectionData = getSectionById(sectionId);
		if (newSectionData) {
			setSection(newSectionData);
			setProgress(getSectionProgress(sectionId));
		}
	}, [sectionId]);

	if (!section) {
		return (
			<div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
				<div className="text-[var(--foreground-muted)]">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[var(--background)]">
			<Navigation />
			
			<main className="lg:ml-72 pt-16 lg:pt-0">
				<div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
					{/* Breadcrumb */}
					<Link 
						href="/"
						className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-6 transition-colors"
					>
						<ArrowLeft size={16} />
						<span>Back to sections</span>
					</Link>

					{/* Section Header */}
					<div className="mb-8">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
								<BookOpen size={24} className="text-blue-500" />
							</div>
							<span className="text-sm font-medium bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full">
								{section.percentage}% of exam
							</span>
						</div>
						<h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">{section.title}</h1>
						<p className="text-[var(--foreground-muted)]">{section.description}</p>
					</div>

					{/* Progress Card */}
					<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-8">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-3">
								<Target size={20} className="text-[var(--foreground-muted)]" />
								<span className="text-[var(--foreground)] font-medium">Section Progress</span>
							</div>
							<span className={`text-lg font-bold ${
								progress.percentage === 100 ? "text-green-500" : "text-[var(--foreground)]"
							}`}>
								{progress.percentage}%
							</span>
						</div>
						<div className="progress-bar mb-3">
							<div 
								className="progress-fill"
								style={{ width: `${progress.percentage}%` }}
							/>
						</div>
						<p className="text-sm text-[var(--foreground-muted)]">
							{progress.completed} of {progress.total} topics completed
						</p>
					</div>

					{/* Topics List */}
					<div>
						<h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">Topics</h2>
						<div className="space-y-3">
							{section.topics.map((topic, index) => (
								<TopicCard 
									key={topic.id}
									sectionId={section.id}
									topic={topic}
									index={index}
								/>
							))}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
