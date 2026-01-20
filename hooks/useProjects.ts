import { useCallback } from 'react';
import { Project, Dimensions, FurnitureItem } from '../types';
import { DEFAULT_ROOM_DIMS } from '../constants';
import { useLocalStorage } from './useLocalStorage';

interface ProjectsState {
    projects: Project[];
    currentProjectId: string;
}

const createDefaultProject = (): Project => ({
    id: crypto.randomUUID?.() || Date.now().toString(),
    name: '默认设计',
    dimensions: DEFAULT_ROOM_DIMS,
    items: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
});

export function useProjects() {
    const [state, setState] = useLocalStorage<ProjectsState>('spaceplan-projects', {
        projects: [createDefaultProject()],
        currentProjectId: '',
    });

    // Ensure currentProjectId is valid
    const currentProjectId = state.currentProjectId || state.projects[0]?.id || '';
    const currentProject = state.projects.find(p => p.id === currentProjectId) || state.projects[0];

    const updateState = useCallback((updates: Partial<ProjectsState>) => {
        setState(prevState => ({ ...prevState, ...updates }));
    }, [setState]);

    const createProject = useCallback((name?: string) => {
        const newProject: Project = {
            id: crypto.randomUUID?.() || Date.now().toString(),
            name: name || `设计 ${state.projects.length + 1}`,
            dimensions: DEFAULT_ROOM_DIMS,
            items: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        updateState({
            projects: [...state.projects, newProject],
            currentProjectId: newProject.id,
        });

        return newProject.id;
    }, [state.projects, updateState]);

    const deleteProject = useCallback((projectId: string) => {
        if (state.projects.length <= 1) {
            alert('至少需要保留一个项目');
            return;
        }

        const newProjects = state.projects.filter(p => p.id !== projectId);
        const newCurrentId = projectId === currentProjectId
            ? newProjects[0].id
            : currentProjectId;

        updateState({
            projects: newProjects,
            currentProjectId: newCurrentId,
        });
    }, [state.projects, currentProjectId, updateState]);

    const switchProject = useCallback((projectId: string) => {
        updateState({ currentProjectId: projectId });
    }, [updateState]);

    const renameProject = useCallback((projectId: string, newName: string) => {
        const newProjects = state.projects.map(p =>
            p.id === projectId
                ? { ...p, name: newName, updatedAt: Date.now() }
                : p
        );
        updateState({ projects: newProjects });
    }, [state.projects, updateState]);

    const updateCurrentProject = useCallback((
        updates: { dimensions?: Dimensions; items?: FurnitureItem[] }
    ) => {
        const newProjects = state.projects.map(p =>
            p.id === currentProjectId
                ? { ...p, ...updates, updatedAt: Date.now() }
                : p
        );
        updateState({ projects: newProjects });
    }, [state.projects, currentProjectId, updateState]);

    return {
        projects: state.projects,
        currentProject,
        currentProjectId,
        createProject,
        deleteProject,
        switchProject,
        renameProject,
        updateCurrentProject,
    };
}
