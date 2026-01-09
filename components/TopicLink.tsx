"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, ReactNode } from "react";
import { prefetchContent } from "@/lib/content-cache";
import { getTopicByIds } from "@/lib/exam-data";

interface TopicLinkProps {
	sectionId: string;
	topicId: string;
	children: ReactNode;
	className?: string;
}

export default function TopicLink({ sectionId, topicId, children, className }: TopicLinkProps) {
	const linkRef = useRef<HTMLAnchorElement>(null);
	const hasPrefetched = useRef(false);

	const doPrefetch = useCallback(() => {
		if (hasPrefetched.current) return;
		hasPrefetched.current = true;
		
		const topic = getTopicByIds(sectionId, topicId);
		prefetchContent(sectionId, topicId, topic?.title);
	}, [sectionId, topicId]);

	// Prefetch when link comes into view
	useEffect(() => {
		const link = linkRef.current;
		if (!link) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						doPrefetch();
						observer.disconnect();
					}
				});
			},
			{ rootMargin: "100px" } // Start prefetching 100px before visible
		);

		observer.observe(link);

		return () => observer.disconnect();
	}, [doPrefetch]);

	return (
		<Link
			ref={linkRef}
			href={`/${sectionId}/${topicId}`}
			className={className}
			onMouseEnter={doPrefetch}
			prefetch={true}
		>
			{children}
		</Link>
	);
}
