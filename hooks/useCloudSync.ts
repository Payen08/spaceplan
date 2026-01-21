import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Project } from '../types';

export interface CloudSyncStatus {
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncError: string | null;
    accountId: string | null;
}

export const useCloudSync = () => {
    const [status, setStatus] = useState<CloudSyncStatus>({
        isSyncing: false,
        lastSyncTime: null,
        syncError: null,
        accountId: localStorage.getItem('cloudAccountId') || null
    });

    /**
     * Set account ID for syncing
     */
    const setAccountId = (accountId: string) => {
        localStorage.setItem('cloudAccountId', accountId);
        setStatus(prev => ({ ...prev, accountId }));
    };

    /**
     * Get current account ID
     */
    const getAccountId = () => {
        return status.accountId || localStorage.getItem('cloudAccountId');
    };

    /**
     * Save project to Supabase under account
     */
    const saveToCloud = async (project: Project): Promise<boolean> => {
        if (!supabase) {
            setStatus(prev => ({ ...prev, syncError: 'Cloud sync not configured' }));
            return false;
        }

        const accountId = getAccountId();
        if (!accountId) {
            // Silently skip if no account ID set
            return false;
        }

        setStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));

        try {
            // 1. Ensure account exists
            const { error: accountError } = await supabase
                .from('accounts')
                .upsert({ id: accountId }, { onConflict: 'id' });

            if (accountError) throw accountError;

            // 2. Save/update project
            const { error: projectError } = await supabase
                .from('projects')
                .upsert({
                    id: project.id,
                    account_id: accountId,
                    name: project.name,
                    dimensions: project.dimensions,
                    items: project.items,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (projectError) throw projectError;

            const now = new Date();
            setStatus(prev => ({ ...prev, isSyncing: false, lastSyncTime: now, syncError: null }));
            console.log('✅ Project saved to cloud:', project.id, 'for account:', accountId);
            return true;
        } catch (error: any) {
            const errorMsg = error.message || 'Failed to save to cloud';
            setStatus(prev => ({ ...prev, isSyncing: false, syncError: errorMsg }));
            console.error('❌ Cloud save error:', error);
            return false;
        }
    };

    /**
     * Load all projects from account
     */
    const loadAccountProjects = async (accountId: string): Promise<Project[]> => {
        if (!supabase) {
            setStatus(prev => ({ ...prev, syncError: 'Cloud sync not configured' }));
            return [];
        }

        if (!accountId || accountId.trim() === '') {
            setStatus(prev => ({ ...prev, syncError: 'Invalid account ID' }));
            return [];
        }

        setStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('account_id', accountId.trim())
                .order('updated_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                setStatus(prev => ({ ...prev, isSyncing: false, syncError: 'No projects found for this account' }));
                return [];
            }

            const projects: Project[] = data.map(p => ({
                id: p.id,
                name: p.name,
                dimensions: p.dimensions,
                items: p.items || [],
                createdAt: new Date(p.created_at).getTime(),
                updatedAt: new Date(p.updated_at).getTime()
            }));

            const now = new Date();
            setStatus(prev => ({ ...prev, isSyncing: false, lastSyncTime: now, syncError: null, accountId }));
            console.log(`✅ Loaded ${projects.length} projects from account:`, accountId);
            return projects;
        } catch (error: any) {
            const errorMsg = error.message || 'Failed to load from cloud';
            setStatus(prev => ({ ...prev, isSyncing: false, syncError: errorMsg }));
            console.error('❌ Cloud load error:', error);
            return [];
        }
    };

    /**
     * Load single project (legacy support)
     */
    const loadFromCloud = async (projectId: string): Promise<Project | null> => {
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId.trim())
                .single();

            if (error || !data) return null;

            return {
                id: data.id,
                name: data.name,
                dimensions: data.dimensions,
                items: data.items || [],
                createdAt: new Date(data.created_at).getTime(),
                updatedAt: new Date(data.updated_at).getTime()
            };
        } catch {
            return null;
        }
    };

    /**
     * Clear sync error
     */
    const clearError = () => {
        setStatus(prev => ({ ...prev, syncError: null }));
    };

    return {
        saveToCloud,
        loadAccountProjects,
        loadFromCloud,
        setAccountId,
        getAccountId,
        clearError,
        status
    };
};
