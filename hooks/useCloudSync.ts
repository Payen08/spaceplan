import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Project } from '../types';

export interface CloudSyncStatus {
    isSyncing: boolean;
    lastSyncTime: Date | null;
    syncError: string | null;
}

export const useCloudSync = () => {
    const [status, setStatus] = useState<CloudSyncStatus>({
        isSyncing: false,
        lastSyncTime: null,
        syncError: null
    });

    /**
     * Save project to Supabase
     */
    const saveToCloud = async (project: Project): Promise<boolean> => {
        if (!supabase) {
            setStatus(prev => ({ ...prev, syncError: 'Cloud sync not configured' }));
            return false;
        }

        setStatus({ isSyncing: true, lastSyncTime: null, syncError: null });

        try {
            const { error } = await supabase
                .from('projects')
                .upsert({
                    id: project.id,
                    name: project.name,
                    dimensions: project.dimensions,
                    items: project.items,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (error) throw error;

            const now = new Date();
            setStatus({ isSyncing: false, lastSyncTime: now, syncError: null });
            console.log('✅ Project saved to cloud:', project.id);
            return true;
        } catch (error: any) {
            const errorMsg = error.message || 'Failed to save to cloud';
            setStatus({ isSyncing: false, lastSyncTime: null, syncError: errorMsg });
            console.error('❌ Cloud save error:', error);
            return false;
        }
    };

    /**
     * Load project from Supabase by ID
     */
    const loadFromCloud = async (projectId: string): Promise<Project | null> => {
        if (!supabase) {
            setStatus(prev => ({ ...prev, syncError: 'Cloud sync not configured' }));
            return null;
        }

        if (!projectId || projectId.trim() === '') {
            setStatus(prev => ({ ...prev, syncError: 'Invalid project ID' }));
            return null;
        }

        setStatus({ isSyncing: true, lastSyncTime: null, syncError: null });

        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId.trim())
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    throw new Error('Project not found');
                }
                throw error;
            }

            if (!data) {
                throw new Error('Project not found');
            }

            const project: Project = {
                id: data.id,
                name: data.name,
                dimensions: data.dimensions,
                items: data.items || [],
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };

            const now = new Date();
            setStatus({ isSyncing: false, lastSyncTime: now, syncError: null });
            console.log('✅ Project loaded from cloud:', project.id);
            return project;
        } catch (error: any) {
            const errorMsg = error.message || 'Failed to load from cloud';
            setStatus({ isSyncing: false, lastSyncTime: null, syncError: errorMsg });
            console.error('❌ Cloud load error:', error);
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
        loadFromCloud,
        clearError,
        status
    };
};
