"use client";

import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import ProgressTracker from "@/components/ProgressTracker";
import { resetProgress, getOverallProgress } from "@/lib/progress";
import { examData } from "@/lib/exam-data";
import { RotateCcw, Trophy, Target, TrendingUp } from "lucide-react";

export default function ProgressPage() {
	const [showResetConfirm, setShowResetConfirm] = useState(false);
	const [progress, setProgress] = useState<any>({ percentage: 0, totalCompleted: 0, totalTopics: 0, sections: {} });

	useEffect(() => {
		setProgress(getOverallProgress());
	}, []);

	const handleReset = () => {
		resetProgress();
		setShowResetConfirm(false);
		setProgress(getOverallProgress());
		window.location.reload();
	};

	const getCompletedSections = () => {
		return examData.sections.filter(section => {
			const sectionProgress = progress.sections?.[section.id];
			return sectionProgress?.percentage === 100;
		}).length;
	};

	return (
		<div className="min-h-screen bg-[var(--background)]">
			<Navigation />
			
			<main className="lg:ml-72 pt-16 lg:pt-0">
				<div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
					{/* Header */}
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Progress Dashboard</h1>
							<p className="text-[var(--foreground-muted)]">Track your learning journey</p>
						</div>
						<button
							onClick={() => setShowResetConfirm(true)}
							className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-alt)] text-[var(--foreground-muted)] rounded-lg hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] transition-colors"
						>
							<RotateCcw size={16} />
							<span>Reset Progress</span>
						</button>
					</div>

					{/* Quick Stats */}
					<div className="grid grid-cols-3 gap-4 mb-8">
						<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
							<div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
								<Target size={24} className="text-blue-500" />
							</div>
							<div className="text-3xl font-bold text-[var(--foreground)]">{progress.totalCompleted}</div>
							<div className="text-sm text-[var(--foreground-muted)]">Topics Completed</div>
						</div>
						
						<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
							<div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
								<Trophy size={24} className="text-green-500" />
							</div>
							<div className="text-3xl font-bold text-[var(--foreground)]">{getCompletedSections()}</div>
							<div className="text-sm text-[var(--foreground-muted)]">Sections Complete</div>
						</div>
						
						<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 text-center">
							<div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-3">
								<TrendingUp size={24} className="text-purple-500" />
							</div>
							<div className="text-3xl font-bold text-[var(--foreground)]">
								{progress.totalTopics - progress.totalCompleted}
							</div>
							<div className="text-sm text-[var(--foreground-muted)]">Topics Remaining</div>
						</div>
					</div>

					{/* Detailed Progress */}
					<ProgressTracker />

					{/* Motivation Section */}
					{progress.percentage < 100 && (
						<div className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-[var(--border)]">
							<h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Keep Going!</h3>
							<p className="text-[var(--foreground-muted)]">
								{progress.percentage < 25 
									? "You're just getting started! Take it one topic at a time."
									: progress.percentage < 50
									? "Great progress! You're building a solid foundation."
									: progress.percentage < 75
									? "You're past the halfway mark! Keep up the momentum."
									: "Almost there! The finish line is in sight."}
							</p>
						</div>
					)}

					{progress.percentage === 100 && (
						<div className="mt-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/30 text-center">
							<Trophy size={48} className="text-green-500 mx-auto mb-4" />
							<h3 className="text-2xl font-bold text-[var(--foreground)] mb-2">Congratulations!</h3>
							<p className="text-[var(--foreground-muted)]">
								You&apos;ve completed all topics. You&apos;re ready for the exam!
							</p>
						</div>
					)}
				</div>
			</main>

			{/* Reset Confirmation Modal */}
			{showResetConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 max-w-md mx-4">
						<h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">Reset Progress?</h3>
						<p className="text-[var(--foreground-muted)] mb-6">
							This will clear all your progress. This action cannot be undone.
						</p>
						<div className="flex gap-3">
							<button
								onClick={() => setShowResetConfirm(false)}
								className="flex-1 px-4 py-2 bg-[var(--surface-alt)] text-[var(--foreground)] rounded-lg hover:bg-[var(--surface-hover)]"
							>
								Cancel
							</button>
							<button
								onClick={handleReset}
								className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
							>
								Reset
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
