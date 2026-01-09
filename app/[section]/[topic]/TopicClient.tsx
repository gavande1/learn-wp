"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import TopicLink from "@/components/TopicLink";
import { getSectionById, getTopicByIds, getNextTopic, getPrevTopic } from "@/lib/exam-data";
import { isTopicComplete, toggleTopicComplete } from "@/lib/progress";
import { fetchContent, getCachedContent, prefetchContent } from "@/lib/content-cache";
import { Section, TopicMeta } from "@/types/exam";
import { 
	ArrowLeft, 
	ArrowRight, 
	CheckCircle2, 
	Circle,
	BookOpen,
	ChevronLeft,
	Loader2
} from "lucide-react";

// Content skeleton component to prevent CLS
function ContentSkeleton() {
	return (
		<div className="animate-pulse min-h-[400px]">
			{/* Title skeleton */}
			<div className="h-8 w-3/4 bg-[var(--surface-alt)] rounded mb-6" />
			
			{/* Section heading skeleton */}
			<div className="h-6 w-1/3 bg-[var(--surface-alt)] rounded mb-4 mt-8" />
			<div className="h-px w-full bg-[var(--border)] mb-4" />
			
			{/* Paragraph skeletons */}
			<div className="space-y-2 mb-6">
				<div className="h-4 w-full bg-[var(--surface-alt)] rounded" />
				<div className="h-4 w-11/12 bg-[var(--surface-alt)] rounded" />
				<div className="h-4 w-4/5 bg-[var(--surface-alt)] rounded" />
			</div>
			
			{/* Code block skeleton */}
			<div className="h-32 w-full bg-[var(--surface-alt)] rounded-lg mb-6" />
			
			{/* Another section */}
			<div className="h-6 w-2/5 bg-[var(--surface-alt)] rounded mb-4 mt-8" />
			<div className="h-px w-full bg-[var(--border)] mb-4" />
			
			{/* List skeleton */}
			<div className="space-y-3 mb-6">
				<div className="flex items-start gap-2">
					<div className="h-4 w-4 bg-[var(--surface-alt)] rounded mt-0.5" />
					<div className="h-4 w-3/4 bg-[var(--surface-alt)] rounded" />
				</div>
				<div className="flex items-start gap-2">
					<div className="h-4 w-4 bg-[var(--surface-alt)] rounded mt-0.5" />
					<div className="h-4 w-2/3 bg-[var(--surface-alt)] rounded" />
				</div>
				<div className="flex items-start gap-2">
					<div className="h-4 w-4 bg-[var(--surface-alt)] rounded mt-0.5" />
					<div className="h-4 w-5/6 bg-[var(--surface-alt)] rounded" />
				</div>
			</div>
			
			{/* Another code block skeleton */}
			<div className="h-24 w-full bg-[var(--surface-alt)] rounded-lg mb-6" />
		</div>
	);
}

export default function TopicClient({ sectionId, topicId }: { sectionId: string; topicId: string }) {
	// Initialize metadata synchronously to avoid loading state
	const sectionData = getSectionById(sectionId) || null;
	const topicData = getTopicByIds(sectionId, topicId) || null;
	const cachedContent = getCachedContent(sectionId, topicId);
	
	const [section, setSection] = useState<Section | null>(sectionData);
	const [topic, setTopic] = useState<TopicMeta | null>(topicData);
	const [content, setContent] = useState<string>(cachedContent || "");
	const [isComplete, setIsComplete] = useState(() => isTopicComplete(sectionId, topicId));
	const [nextTopicInfo, setNextTopicInfo] = useState<{ sectionId: string; topicId: string } | null>(() => 
		sectionData && topicData ? getNextTopic(sectionId, topicId) : null
	);
	const [prevTopicInfo, setPrevTopicInfo] = useState<{ sectionId: string; topicId: string } | null>(() => 
		sectionData && topicData ? getPrevTopic(sectionId, topicId) : null
	);
	const [initialLoading, setInitialLoading] = useState(!cachedContent);
	const [isLoadingContent, setIsLoadingContent] = useState(false);
	const [isPending, startTransition] = useTransition();

	// Effect to load data when params change
	useEffect(() => {
		const secId = sectionId;
		const topId = topicId;
		
		const newSectionData = getSectionById(secId);
		const newTopicData = getTopicByIds(secId, topId);
		
		if (!newSectionData || !newTopicData) {
			setSection(null);
			setTopic(null);
			setInitialLoading(false);
			setIsLoadingContent(false);
			return;
		}

		// Update metadata immediately (no async needed)
		setSection(newSectionData);
		setTopic(newTopicData);
		setIsComplete(isTopicComplete(secId, topId));
		
		const next = getNextTopic(secId, topId);
		const prev = getPrevTopic(secId, topId);
		setNextTopicInfo(next);
		setPrevTopicInfo(prev);

		// Immediately prefetch adjacent topics (don't wait for current content)
		if (next) {
			const nextTopic = getTopicByIds(next.sectionId, next.topicId);
			prefetchContent(next.sectionId, next.topicId, nextTopic?.title);
		}
		if (prev) {
			const prevTopic = getTopicByIds(prev.sectionId, prev.topicId);
			prefetchContent(prev.sectionId, prev.topicId, prevTopic?.title);
		}

		// Check cache first for instant display
		const newCachedContent = getCachedContent(secId, topId);
		if (newCachedContent) {
			setContent(newCachedContent);
			setInitialLoading(false);
			setIsLoadingContent(false);
			return;
		}

		// Show loading skeleton while fetching
		setIsLoadingContent(true);

		// Fetch content with transition
		startTransition(async () => {
			const newContent = await fetchContent(secId, topId, newTopicData.title);
			setContent(newContent);
			setInitialLoading(false);
			setIsLoadingContent(false);
		});
	}, [sectionId, topicId]);

	const handleToggleComplete = () => {
		const newStatus = toggleTopicComplete(sectionId, topicId);
		setIsComplete(newStatus);
	};

	// Show full-page loading only on initial load (no cached content available)
	if (initialLoading && !content) {
		return (
			<div className="min-h-screen bg-[var(--background)]">
				<Navigation />
				<main className="lg:ml-72 pt-16 lg:pt-0">
					<div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
						{/* Skeleton loader */}
						<div className="animate-pulse">
							<div className="flex items-center gap-2 mb-6">
								<div className="h-4 w-16 bg-[var(--surface-alt)] rounded" />
								<div className="h-4 w-4 bg-[var(--surface-alt)] rounded" />
								<div className="h-4 w-24 bg-[var(--surface-alt)] rounded" />
							</div>
							<div className="flex items-center gap-3 mb-8">
								<div className="w-10 h-10 bg-[var(--surface-alt)] rounded-lg" />
								<div className="h-6 w-32 bg-[var(--surface-alt)] rounded" />
							</div>
							<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 lg:p-8 mb-8">
								<ContentSkeleton />
							</div>
						</div>
					</div>
				</main>
			</div>
		);
	}

	if (!section || !topic) {
		return (
			<div className="min-h-screen bg-[var(--background)]">
				<Navigation />
				<main className="lg:ml-72 pt-16 lg:pt-0 flex items-center justify-center">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Topic Not Found</h1>
						<Link href="/" className="text-blue-500 hover:text-blue-400">
							Return to home
						</Link>
					</div>
				</main>
			</div>
		);
	}

	// Determine if we should show loading skeleton (loading new content, not from cache)
	const showLoadingSkeleton = isLoadingContent || isPending;

	return (
		<div className="min-h-screen bg-[var(--background)]">
			<Navigation />
			
			<main className="lg:ml-72 pt-16 lg:pt-0">
				<div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
					{/* Breadcrumb */}
					<div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] mb-6">
						<Link href="/" className="hover:text-[var(--foreground)]">Home</Link>
						<ChevronLeft size={14} className="rotate-180" />
						<Link href={`/${section.id}`} className="hover:text-[var(--foreground)]">{section.title}</Link>
						<ChevronLeft size={14} className="rotate-180" />
						<span className="text-[var(--foreground)]">{topic.title}</span>
					</div>

					{/* Topic Header */}
					<div className="mb-8">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
								<BookOpen size={20} className="text-blue-500" />
							</div>
							<span className="text-xs font-medium bg-[var(--surface-alt)] text-[var(--foreground-muted)] px-2 py-1 rounded">
								{section.title}
							</span>
							{/* Loading indicator for content transitions */}
							{showLoadingSkeleton && (
								<div className="flex items-center gap-2 text-[var(--primary)]">
									<Loader2 size={16} className="animate-spin" />
									<span className="text-xs font-medium">Loading content...</span>
								</div>
							)}
						</div>
					</div>

					{/* Content area with fixed minimum height to prevent CLS */}
					<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 lg:p-8 mb-8 min-h-[400px]">
						{showLoadingSkeleton ? (
							<ContentSkeleton />
						) : (
							<MarkdownRenderer content={content} />
						)}
					</div>

					{/* Mark Complete Button */}
					<div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-8">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-semibold text-[var(--foreground)] mb-1">
									{isComplete ? "Topic Completed!" : "Mark as Complete"}
								</h3>
								<p className="text-sm text-[var(--foreground-muted)]">
									{isComplete 
										? "Great job! You can unmark if needed." 
										: "Click the button when you've finished studying this topic."}
								</p>
							</div>
							<button
								onClick={handleToggleComplete}
								className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
									isComplete
										? "bg-green-500 text-white hover:bg-green-600"
										: "bg-[var(--surface-alt)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
								}`}
							>
								{isComplete ? (
									<>
										<CheckCircle2 size={20} />
										<span>Completed</span>
									</>
								) : (
									<>
										<Circle size={20} />
										<span>Mark Complete</span>
									</>
								)}
							</button>
						</div>
					</div>

					{/* Navigation with prefetch */}
					<div className="flex items-center justify-between gap-4">
						{prevTopicInfo ? (
							<TopicLink
								sectionId={prevTopicInfo.sectionId}
								topicId={prevTopicInfo.topicId}
								className="flex items-center gap-2 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-[var(--border-light)] transition-colors flex-1"
							>
								<ArrowLeft size={18} className="text-[var(--foreground-muted)]" />
								<div className="text-left">
									<div className="text-xs text-[var(--foreground-muted)]">Previous</div>
									<div className="text-sm font-medium text-[var(--foreground)] truncate">
										{getTopicByIds(prevTopicInfo.sectionId, prevTopicInfo.topicId)?.title}
									</div>
								</div>
							</TopicLink>
						) : (
							<div className="flex-1" />
						)}
						
						{nextTopicInfo ? (
							<TopicLink
								sectionId={nextTopicInfo.sectionId}
								topicId={nextTopicInfo.topicId}
								className="flex items-center gap-2 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg hover:border-[var(--border-light)] transition-colors flex-1 justify-end"
							>
								<div className="text-right">
									<div className="text-xs text-[var(--foreground-muted)]">Next</div>
									<div className="text-sm font-medium text-[var(--foreground)] truncate">
										{getTopicByIds(nextTopicInfo.sectionId, nextTopicInfo.topicId)?.title}
									</div>
								</div>
								<ArrowRight size={18} className="text-[var(--foreground-muted)]" />
							</TopicLink>
						) : (
							<Link
								href="/progress"
								className="flex items-center gap-2 px-4 py-3 bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
							>
								<span className="text-sm font-medium text-white">View Progress</span>
								<ArrowRight size={18} className="text-white" />
							</Link>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
