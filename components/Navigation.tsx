"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { examData } from "@/lib/exam-data";
import { getOverallProgress, isTopicComplete } from "@/lib/progress";
import { useTheme } from "@/contexts/ThemeContext";
import { 
	ChevronDown, 
	ChevronRight, 
	CheckCircle2, 
	Circle,
	BookOpen,
	BarChart3,
	Home,
	Menu,
	X,
	Sun,
	Moon
} from "lucide-react";

export default function Navigation() {
	const pathname = usePathname();
	const { theme, toggleTheme } = useTheme();
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
	const [progress, setProgress] = useState({ percentage: 0 });
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	useEffect(() => {
		setProgress(getOverallProgress());
		
		// Expand current section
		const currentSection = pathname.split("/")[1];
		if (currentSection && examData.sections.find(s => s.id === currentSection)) {
			setExpandedSections(prev => new Set([...prev, currentSection]));
		}
	}, [pathname]);

	const toggleSection = (sectionId: string) => {
		setExpandedSections(prev => {
			const newSet = new Set(prev);
			if (newSet.has(sectionId)) {
				newSet.delete(sectionId);
			} else {
				newSet.add(sectionId);
			}
			return newSet;
		});
	};

	const navContent = (
		<>
			{/* Logo/Header */}
			<div className="p-6 border-b border-[var(--border)]">
				<div className="flex items-center justify-between">
					<Link href="/" className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
							<BookOpen size={20} className="text-white" />
						</div>
						<div>
							<h1 className="font-bold text-[var(--foreground)]">WP Cert Prep</h1>
							<p className="text-xs text-[var(--foreground-muted)]">Advanced Developer</p>
						</div>
					</Link>
					<button
						onClick={toggleTheme}
						className="p-2 rounded-lg bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
						aria-label="Toggle theme"
					>
						{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
					</button>
				</div>
			</div>

			{/* Progress Summary */}
			<div className="p-4 border-b border-[var(--border)]">
				<div className="flex items-center justify-between mb-2">
					<span className="text-sm text-[var(--foreground-muted)]">Overall Progress</span>
					<span className="text-sm font-semibold text-blue-500">{progress.percentage}%</span>
				</div>
				<div className="progress-bar">
					<div 
						className="progress-fill" 
						style={{ width: `${progress.percentage}%` }}
					/>
				</div>
			</div>

			{/* Quick Links */}
			<div className="p-4 border-b border-[var(--border)]">
				<nav className="space-y-1">
					<Link 
						href="/"
						className={`nav-item ${pathname === "/" ? "active" : ""}`}
						onClick={() => setIsMobileMenuOpen(false)}
					>
						<Home size={18} />
						<span>Home</span>
					</Link>
					<Link 
						href="/progress"
						className={`nav-item ${pathname === "/progress" ? "active" : ""}`}
						onClick={() => setIsMobileMenuOpen(false)}
					>
						<BarChart3 size={18} />
						<span>Progress Dashboard</span>
					</Link>
				</nav>
			</div>

			{/* Sections */}
			<div className="flex-1 overflow-y-auto p-4">
				<h3 className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider mb-3">
					Exam Sections
				</h3>
				<nav className="space-y-1">
					{examData.sections.map((section) => {
						const isExpanded = expandedSections.has(section.id);
						const isActive = pathname.startsWith(`/${section.id}`);
						
						return (
							<div key={section.id}>
								<button
									onClick={() => toggleSection(section.id)}
									className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
										isActive 
											? "bg-[var(--surface-hover)] text-[var(--foreground)]" 
											: "text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
									}`}
								>
									<div className="flex items-center gap-2 text-left">
										<span className="text-xs font-medium bg-[var(--surface-alt)] px-2 py-0.5 rounded">
											{section.percentage}%
										</span>
										<span className="text-sm font-medium">{section.title}</span>
									</div>
									{isExpanded ? (
										<ChevronDown size={16} />
									) : (
										<ChevronRight size={16} />
									)}
								</button>
								
								{isExpanded && (
									<div className="ml-4 mt-1 space-y-1 border-l border-[var(--border)] pl-4">
										<Link
											href={`/${section.id}`}
											className={`block py-2 px-3 text-sm rounded-md transition-colors ${
												pathname === `/${section.id}`
													? "bg-blue-500/20 text-blue-500"
													: "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
											}`}
											onClick={() => setIsMobileMenuOpen(false)}
										>
											Overview
										</Link>
										{section.topics.map((topic) => {
											const isComplete = isTopicComplete(section.id, topic.id);
											const isTopicActive = pathname === `/${section.id}/${topic.id}`;
											
											return (
												<Link
													key={topic.id}
													href={`/${section.id}/${topic.id}`}
													className={`flex items-center gap-2 py-2 px-3 text-sm rounded-md transition-colors ${
														isTopicActive
															? "bg-blue-500/20 text-blue-500"
															: isComplete
															? "text-green-500"
															: "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
													}`}
													onClick={() => setIsMobileMenuOpen(false)}
												>
													{isComplete ? (
														<CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
													) : (
														<Circle size={14} className="flex-shrink-0" />
													)}
													<span className="truncate">{topic.title}</span>
												</Link>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</nav>
			</div>
		</>
	);

	return (
		<>
			{/* Mobile Header */}
			<div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--surface)] border-b border-[var(--border)] p-4 flex items-center justify-between">
				<Link href="/" className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
						<BookOpen size={16} className="text-white" />
					</div>
					<span className="font-bold text-[var(--foreground)]">WP Cert Prep</span>
				</Link>
				<div className="flex items-center gap-2">
					<button
						onClick={toggleTheme}
						className="p-2 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
						aria-label="Toggle theme"
					>
						{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
					</button>
					<button
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						className="p-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
					>
						{isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
					</button>
				</div>
			</div>

			{/* Mobile Menu Overlay */}
			{isMobileMenuOpen && (
				<div 
					className="lg:hidden fixed inset-0 z-40 bg-black/50"
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* Mobile Sidebar */}
			<aside className={`
				lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-[var(--surface)] border-r border-[var(--border)]
				transform transition-transform duration-300 flex flex-col
				${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
			`}>
				{navContent}
			</aside>

			{/* Desktop Sidebar */}
			<aside className="hidden lg:flex fixed top-0 left-0 h-screen w-72 bg-[var(--surface)] border-r border-[var(--border)] flex-col">
				{navContent}
			</aside>
		</>
	);
}
