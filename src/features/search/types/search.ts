/**
 * Search Types - Type definitions for search functionality
 */

export interface SearchResult {
    nodeId: string;
    workspaceId: string;
    workspaceName: string;
    matchedContent: string;
    matchType: 'prompt' | 'output';
    relevance: number;
}

export interface SearchState {
    query: string;
    results: SearchResult[];
    isSearching: boolean;
}
