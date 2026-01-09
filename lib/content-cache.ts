// In-memory content cache for markdown files
const contentCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

export function getCacheKey(sectionId: string, topicId: string): string {
	return `${sectionId}/${topicId}`;
}

export function getCachedContent(sectionId: string, topicId: string): string | null {
	const key = getCacheKey(sectionId, topicId);
	return contentCache.get(key) || null;
}

export async function fetchContent(sectionId: string, topicId: string, fallbackTitle?: string): Promise<string> {
	const key = getCacheKey(sectionId, topicId);
	
	// Return cached content if available
	const cached = contentCache.get(key);
	if (cached) {
		return cached;
	}
	
	// Return pending request if one exists (avoid duplicate fetches)
	const pending = pendingRequests.get(key);
	if (pending) {
		return pending;
	}
	
	// Create new fetch request
	const request = (async () => {
		try {
			const response = await fetch(`/content/${sectionId}/${topicId}.md`);
			if (response.ok) {
				const text = await response.text();
				contentCache.set(key, text);
				return text;
			}
		} catch {
			// Silently fail, return fallback
		}
		
		const fallback = `# ${fallbackTitle || 'Topic'}\n\nContent coming soon...`;
		contentCache.set(key, fallback);
		return fallback;
	})();
	
	pendingRequests.set(key, request);
	
	try {
		const result = await request;
		return result;
	} finally {
		pendingRequests.delete(key);
	}
}

export function prefetchContent(sectionId: string, topicId: string, fallbackTitle?: string): void {
	// Fire and forget - prefetch without waiting
	fetchContent(sectionId, topicId, fallbackTitle);
}

export function clearCache(): void {
	contentCache.clear();
}
