"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSectionProgress } from "@/lib/progress";
import { Section } from "@/types/exam";
import { ChevronRight, BookOpen } from "lucide-react";

interface SectionCardProps {
	section: Section;
}

export default function SectionCard({ section }: SectionCardProps) {
	const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });

	useEffect(() => {
		setProgress(getSectionProgress(section.id));
	}, [section.id]);

	return (
		<Link href={`/${section.id}`} className="block">
			<div className="card group cursor-pointer h-full">
				<div className="flex items-start justify-between mb-4">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
							<BookOpen size={20} className="text-blue-500" />
						</div>
						<div>
							<span className="text-xs font-medium text-blue-500 bg-blue-500/20 px-2 py-0.5 rounded">
								{section.percentage}% of exam
							</span>
						</div>
					</div>
					<ChevronRight 
						size={20} 
						className="text-[var(--foreground-muted)] group-hover:text-blue-500 transition-colors" 
					/>
				</div>

				<h3 className="text-lg font-semibold text-[var(--foreground)] mb-2 group-hover:text-blue-500 transition-colors">
					{section.title}
				</h3>
				
				<p className="text-sm text-[var(--foreground-muted)] mb-4 line-clamp-2">
					{section.description}
				</p>

				<div className="mt-auto">
					<div className="flex items-center justify-between text-sm mb-2">
						<span className="text-[var(--foreground-muted)]">
							{progress.completed} / {progress.total} topics
						</span>
						<span className={`font-medium ${
							progress.percentage === 100 
								? "text-green-500" 
								: "text-[var(--foreground-muted)]"
						}`}>
							{progress.percentage}%
						</span>
					</div>
					<div className="progress-bar">
						<div 
							className="progress-fill" 
							style={{ width: `${progress.percentage}%` }}
						/>
					</div>
				</div>
			</div>
		</Link>
	);
}
