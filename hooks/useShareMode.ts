import { useState, useEffect } from 'react';

export interface ShareMode {
    isReadOnly: boolean;
    shareProjectId: string | null;
    generateShareLink: (projectId: string) => string;
    copyShareLink: (projectId: string) => void;
}

/**
 * Hook to manage share mode state
 * Detects if the app is in read-only share mode via URL parameters
 */
export const useShareMode = (): ShareMode => {
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [shareProjectId, setShareProjectId] = useState<string | null>(null);

    useEffect(() => {
        // Check URL for share parameter
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('share');

        if (projectId) {
            setIsReadOnly(true);
            setShareProjectId(projectId);
            console.log('📖 Read-only share mode activated for project:', projectId);
        }
    }, []);

    /**
     * Generate a share link for a project
     */
    const generateShareLink = (projectId: string): string => {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?share=${projectId}`;
    };

    /**
     * Copy share link to clipboard
     */
    const copyShareLink = (projectId: string) => {
        const link = generateShareLink(projectId);
        navigator.clipboard.writeText(link).then(() => {
            alert(`✅ 分享链接已复制！\n\n${link}\n\n其他人打开此链接可查看你的设计（只读模式）`);
        }).catch(err => {
            console.error('Failed to copy share link:', err);
            alert('❌ 复制失败，请手动复制链接');
        });
    };

    return {
        isReadOnly,
        shareProjectId,
        generateShareLink,
        copyShareLink
    };
};
