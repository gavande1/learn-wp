"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isTopicComplete } from "@/lib/progress";
import { TopicMeta } from "@/types/exam";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

interface TopicCardProps {
	sectionId: string;
	topic: TopicMeta;
	index: number;
}

export default function TopicCard({ sectionId, topic, index }: TopicCardProps) {
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		setIsComplete(isTopicComplete(sectionId, topic.id));
	}, [sectionId, topic.id]);

	return (
		<Link href={`/${sectionId}/${topic.id}`} className="block">
			<div className={`
				flex items-center gap-4 p-4 rounded-lg border transition-all
				${isComplete 
					? "bg-green-500/10 border-green-500/30 hover:border-green-500/50" 
					: "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-light)]"
				}
			`}>
				<div className={`
					w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
					${isComplete 
						? "bg-green-500 text-white" 
						: "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
					}
				`}>
					{isComplete ? (
						<CheckCircle2 size={18} />
					) : (
						<span>{index + 1}</span>
					)}
				</div>
				
				<div className="flex-1 min-w-0">
					<h4 className={`font-medium truncate ${
						isComplete ? "text-green-500" : "text-[var(--foreground)]"
					}`}>
						{topic.title}
					</h4>
				</div>

				<ChevronRight 
					size={18} 
					className={isComplete ? "text-green-500" : "text-[var(--foreground-muted)]"} 
				/>
			</div>
		</Link>
	);
}
