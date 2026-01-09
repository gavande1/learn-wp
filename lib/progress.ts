"use client";

import { examData, getSectionById } from "./exam-data";
import { OverallProgress, SectionProgress } from "@/types/exam";

const STORAGE_KEY = "wp-cert-progress";

export function getCompletedTopics(): Set<string> {
	if (typeof window === "undefined") return new Set();
	
	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return new Set();
	
	try {
		const parsed = JSON.parse(stored);
		return new Set(parsed);
	} catch {
		return new Set();
	}
}

export function saveCompletedTopics(topics: Set<string>): void {
	if (typeof window === "undefined") return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify([...topics]));
}

export function markTopicComplete(sectionId: string, topicId: string): void {
	const completed = getCompletedTopics();
	completed.add(`${sectionId}/${topicId}`);
	saveCompletedTopics(completed);
}

export function markTopicIncomplete(sectionId: string, topicId: string): void {
	const completed = getCompletedTopics();
	completed.delete(`${sectionId}/${topicId}`);
	saveCompletedTopics(completed);
}

export function isTopicComplete(sectionId: string, topicId: string): boolean {
	const completed = getCompletedTopics();
	return completed.has(`${sectionId}/${topicId}`);
}

export function toggleTopicComplete(sectionId: string, topicId: string): boolean {
	const completed = getCompletedTopics();
	const key = `${sectionId}/${topicId}`;
	
	if (completed.has(key)) {
		completed.delete(key);
		saveCompletedTopics(completed);
		return false;
	} else {
		completed.add(key);
		saveCompletedTopics(completed);
		return true;
	}
}

export function getSectionProgress(sectionId: string): SectionProgress {
	const section = getSectionById(sectionId);
	if (!section) return { completed: 0, total: 0, percentage: 0 };
	
	const completed = getCompletedTopics();
	const completedCount = section.topics.filter((t) => completed.has(`${sectionId}/${t.id}`)).length;
	const total = section.topics.length;
	
	return {
		completed: completedCount,
		total,
		percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
	};
}

export function getOverallProgress(): OverallProgress {
	const completed = getCompletedTopics();
	let totalCompleted = 0;
	let totalTopics = 0;
	const sections: Record<string, SectionProgress> = {};
	
	examData.sections.forEach((section) => {
		const sectionCompleted = section.topics.filter((t) => completed.has(`${section.id}/${t.id}`)).length;
		totalCompleted += sectionCompleted;
		totalTopics += section.topics.length;
		
		sections[section.id] = {
			completed: sectionCompleted,
			total: section.topics.length,
			percentage: section.topics.length > 0 ? Math.round((sectionCompleted / section.topics.length) * 100) : 0,
		};
	});
	
	return {
		totalCompleted,
		totalTopics,
		percentage: totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0,
		sections,
	};
}

export function resetProgress(): void {
	if (typeof window === "undefined") return;
	localStorage.removeItem(STORAGE_KEY);
}
