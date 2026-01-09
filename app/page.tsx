"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import SectionCard from "@/components/SectionCard";
import { examData, getTotalTopics } from "@/lib/exam-data";
import { getOverallProgress } from "@/lib/progress";
import { BookOpen, Target, Clock, Award } from "lucide-react";

export default function Home() {
	const [progress, setProgress] = useState({ percentage: 0, totalCompleted: 0 });
	const totalTopics = getTotalTopics();

	useEffect(() => {
		setProgress(getOverallProgress());
	}, []);

	return (
		<div className="min-h-screen bg-[var(--background)]">
			<Navigation />
			
			<main className="lg:ml-72 pt-16 lg:pt-0">
				<div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
					{/* Hero Section */}
					<div className="text-center mb-12">
						<div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-500 px-4 py-2 rounded-full text-sm mb-4">
							<Award size={16} />
							<span>Advanced Professional WordPress Developer</span>
						</div>
						<h1 className="text-4xl lg:text-5xl font-bold text-[var(--foreground)] mb-4">
							Certification Exam
							<span className="text-blue-500"> Study Guide</span>
						</h1>
						<p className="text-lg text-[var(--foreground-muted)] max-w-2xl mx-auto">
							Master enterprise-grade WordPress development with this comprehensive tutorial 
							covering all 8 exam sections with interactive progress tracking.
						</p>
					</div>

					{/* Stats Cards */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
						<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
							<div className="flex items-center gap-3 mb-2">
								<div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
									<BookOpen size={20} className="text-blue-500" />
								</div>
							</div>
							<div className="text-2xl font-bold text-[var(--foreground)]">{examData.sections.length}</div>
							<div className="text-sm text-[var(--foreground-muted)]">Exam Sections</div>
						</div>
						
						<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
							<div className="flex items-center gap-3 mb-2">
								<div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
									<Target size={20} className="text-green-500" />
								</div>
							</div>
							<div className="text-2xl font-bold text-[var(--foreground)]">{totalTopics}</div>
							<div className="text-sm text-[var(--foreground-muted)]">Total Topics</div>
						</div>
						
						<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
							<div className="flex items-center gap-3 mb-2">
								<div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
									<Clock size={20} className="text-purple-500" />
								</div>
							</div>
							<div className="text-2xl font-bold text-[var(--foreground)]">{progress.totalCompleted}</div>
							<div className="text-sm text-[var(--foreground-muted)]">Completed</div>
						</div>
						
						<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
							<div className="flex items-center gap-3 mb-2">
								<div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
									<Award size={20} className="text-amber-500" />
								</div>
							</div>
							<div className="text-2xl font-bold text-[var(--foreground)]">{progress.percentage}%</div>
							<div className="text-sm text-[var(--foreground-muted)]">Progress</div>
						</div>
					</div>

					{/* Overall Progress */}
					<div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 rounded-xl p-6 border border-[var(--border)] mb-12">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
							<div>
								<h2 className="text-xl font-semibold text-[var(--foreground)]">Your Progress</h2>
								<p className="text-[var(--foreground-muted)]">
									{progress.totalCompleted} of {totalTopics} topics completed
								</p>
							</div>
							<div className="text-4xl font-bold text-[var(--foreground)]">
								{progress.percentage}%
							</div>
						</div>
						<div className="h-3 bg-[var(--surface-alt)] rounded-full overflow-hidden">
							<div 
								className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
								style={{ width: `${progress.percentage}%` }}
							/>
						</div>
					</div>

					{/* Sections Grid */}
					<div className="mb-8">
						<h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Exam Sections</h2>
						<div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
							{examData.sections.map((section) => (
								<SectionCard key={section.id} section={section} />
							))}
						</div>
					</div>

					{/* Exam Info */}
					<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
						<h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">About the Exam</h2>
						<div className="grid md:grid-cols-2 gap-6 text-[var(--foreground-muted)]">
							<div>
								<h3 className="font-medium text-[var(--foreground)] mb-2">What You&apos;ll Learn</h3>
								<ul className="space-y-2 text-sm">
									<li>• Deep understanding of WordPress at enterprise scale</li>
									<li>• Security best practices and vulnerability prevention</li>
									<li>• Performance optimization and caching strategies</li>
									<li>• Debugging and troubleshooting complex issues</li>
									<li>• Scalability and architecture patterns</li>
								</ul>
							</div>
							<div>
								<h3 className="font-medium text-[var(--foreground)] mb-2">Exam Format</h3>
								<ul className="space-y-2 text-sm">
									<li>• Scenario-based practical questions</li>
									<li>• Multiple choice questions</li>
									<li>• Code review and analysis</li>
									<li>• Focus on enterprise-level implementations</li>
									<li>• Tests real-world problem-solving skills</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
