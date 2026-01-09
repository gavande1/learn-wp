"use client";

import { useEffect, useState } from "react";
import { getOverallProgress } from "@/lib/progress";
import { examData } from "@/lib/exam-data";
import { OverallProgress } from "@/types/exam";

export default function ProgressTracker() {
	const [progress, setProgress] = useState<OverallProgress | null>(null);

	useEffect(() => {
		setProgress(getOverallProgress());
	}, []);

	if (!progress) {
		return (
			<div className="animate-pulse">
				<div className="h-6 bg-[var(--surface-alt)] rounded w-32 mb-2" />
				<div className="h-4 bg-[var(--surface-alt)] rounded w-full" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Overall Progress */}
			<div className="bg-gradient-to-r from-blue-500/20 to-green-500/20 rounded-xl p-6 border border-[var(--border)]">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h3 className="text-lg font-semibold text-[var(--foreground)]">Overall Progress</h3>
						<p className="text-sm text-[var(--foreground-muted)]">
							{progress.totalCompleted} of {progress.totalTopics} topics completed
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

			{/* Section Progress */}
			<div className="grid gap-4">
				{examData.sections.map((section) => {
					const sectionProgress = progress.sections[section.id];
					
					return (
						<div key={section.id} className="bg-[var(--surface)] rounded-lg p-4 border border-[var(--border)]">
							<div className="flex items-center justify-between mb-2">
								<div className="flex items-center gap-3">
									<span className="text-xs font-medium bg-[var(--surface-alt)] px-2 py-1 rounded text-[var(--foreground-muted)]">
										{section.percentage}%
									</span>
									<span className="font-medium text-[var(--foreground)]">{section.title}</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-[var(--foreground-muted)]">
										{sectionProgress?.completed || 0}/{sectionProgress?.total || 0}
									</span>
									<span className={`text-sm font-semibold ${
										sectionProgress?.percentage === 100 
											? "text-green-500" 
											: "text-[var(--foreground-muted)]"
									}`}>
										{sectionProgress?.percentage || 0}%
									</span>
								</div>
							</div>
							<div className="progress-bar">
								<div 
									className="progress-fill"
									style={{ width: `${sectionProgress?.percentage || 0}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
