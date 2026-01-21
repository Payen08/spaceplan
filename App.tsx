import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RoomCanvas } from './components/RoomCanvas';
import { Sidebar } from './components/Sidebar';
import { Dimensions, FurnitureItem, FurnitureType } from './types';
import { generateLayoutSuggestion } from './services/geminiService';
import { useProjects } from './hooks/useProjects';
import { useCloudSync } from './hooks/useCloudSync';
import { exportCanvasAsPNG } from './utils/exportPNG';

const App: React.FC = () => {
  // Project Management
  const {
    projects,
    currentProject,
    createProject,
    deleteProject,
    switchProject,
    renameProject,
    updateCurrentProject,
    loadCloudProjects, // For cloud sync
  } = useProjects();

  const [dimensions, setDimensions] = useState<Dimensions>(currentProject.dimensions);

  // History State Management
  const [history, setHistory] = useState<FurnitureItem[][]>([currentProject.items]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Derived current state
  const items = history[historyIndex];

  // Sync dimensions and items when project changes
  useEffect(() => {
    setDimensions(currentProject.dimensions);
    setHistory([currentProject.items]);
    setHistoryIndex(0);
    setSelectedId(null);
  }, [currentProject.id, currentProject.updatedAt]); // Also watch updatedAt to catch content changes

  // Cloud Sync Hook
  const cloudSync = useCloudSync();
  const isSyncingRef = useRef(false);

  // Auto-save to localStorage when items or dimensions change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateCurrentProject({ dimensions, items });

      // Auto-sync to cloud if configured (debounced and prevent infinite loop)
      if (cloudSync && !isSyncingRef.current) {
        isSyncingRef.current = true;

        // Build updated project with latest data
        const updatedProject = {
          ...currentProject,
          dimensions,
          items,
          updatedAt: Date.now()
        };

        cloudSync.saveToCloud(updatedProject)
          .catch(err => console.error('Auto cloud sync failed:', err))
          .finally(() => {
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 1000); // Cooldown period
          });
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [items, dimensions]); // Remove cloudSync and currentProject from deps

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(true);

  const selectedItem = items.find(i => i.id === selectedId) || null;

  // History Helpers
  const pushHistory = useCallback((newItems: FurnitureItem[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newItems];
    });
    setHistoryIndex(prev => prev + 1); // This relies on the functional update being synchronous logic essentially
  }, [historyIndex]);

  // Use a safer push that doesn't rely on closure staleness for the index inside the setter if called rapidly
  const safePushHistory = (newItems: FurnitureItem[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(newItems);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const undo = useCallback(() => {
    setHistoryIndex(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex(prev => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Z or Cmd+Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
      }
      // Check for Ctrl+Y or Cmd+Y (Redo)
      else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        redo();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Actions
  const handleAddItem = (preset: Partial<FurnitureItem>) => {
    // Generate UUID with fallback for browsers that don't support crypto.randomUUID
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback UUID generation
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const newItem: FurnitureItem = {
      id: generateUUID(),
      name: preset.name || '新物品',
      type: preset.type || FurnitureType.CUSTOM,
      width: preset.width || 1,
      depth: preset.depth || 1,
      x: dimensions.width / 2 - (preset.width || 1) / 2, // Center in room
      y: dimensions.length / 2 - (preset.depth || 1) / 2,
      rotation: 0,
      color: preset.color || '#cbd5e1',
      ...(preset.lightRange !== undefined && { lightRange: preset.lightRange }),
    };
    safePushHistory([...items, newItem]);
    setSelectedId(newItem.id);
  };

  const handleUpdateItem = (updatedItem: FurnitureItem) => {
    const newItems = items.map(item => item.id === updatedItem.id ? updatedItem : item);
    safePushHistory(newItems);
  };

  const handleDeleteItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    safePushHistory(newItems);
    if (selectedId === id) setSelectedId(null);
  };

  // Called when drag/resize ends
  const handleItemsChange = (newItems: FurnitureItem[]) => {
    safePushHistory(newItems);
  };

  const handleGenerateAI = async (description: string, roomType: string) => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const suggestedItems = await generateLayoutSuggestion(
        roomType,
        dimensions.width,
        dimensions.length,
        description
      );

      if (suggestedItems && suggestedItems.length > 0) {
        safePushHistory(suggestedItems);
        setSelectedId(null); // Deselect any existing
      } else {
        setErrorMsg("AI 无法生成有效的布局，请尝试提供更多细节。");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("连接 AI 服务失败，请检查 API 密钥配置。");
    } finally {
      setIsGenerating(false);
    }
  };

  // Keyboard arrow key controls for moving furniture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;

      const selectedItem = items.find(item => item.id === selectedId);
      if (!selectedItem || selectedItem.locked) return;

      // Don't handle if typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const step = e.shiftKey ? 0.1 : 0.01; // Shift = 100mm, normal = 10mm
      let newX = selectedItem.x;
      let newY = selectedItem.y;

      switch (e.key) {
        case 'ArrowLeft':
          newX = Math.max(0, selectedItem.x - step);
          e.preventDefault();
          break;
        case 'ArrowRight':
          newX = Math.min(dimensions.width - selectedItem.width, selectedItem.x + step);
          e.preventDefault();
          break;
        case 'ArrowUp':
          newY = Math.max(0, selectedItem.y - step);
          e.preventDefault();
          break;
        case 'ArrowDown':
          newY = Math.min(dimensions.length - selectedItem.depth, selectedItem.y + step);
          e.preventDefault();
          break;
        default:
          return;
      }

      const updatedItems = items.map(item =>
        item.id === selectedId ? { ...item, x: newX, y: newY } : item
      );
      setHistory([...history.slice(0, historyIndex + 1), updatedItems]);
      setHistoryIndex(historyIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, items, dimensions, history, historyIndex]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">

      {/* Left Sidebar */}
      <Sidebar
        dimensions={dimensions}
        onDimensionsChange={setDimensions}
        onAddItem={handleAddItem}
        selectedItem={selectedItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onGenerateAI={handleGenerateAI}
        isGenerating={isGenerating}
        projects={projects}
        currentProject={currentProject}
        onCreateProject={createProject}
        onSwitchProject={switchProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        cloudSync={cloudSync}
      />

      {/* Main Canvas Area */}
      <main className="flex-1 relative flex flex-col">
        {/* Cloud Sync Status - Top Left */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          {/* Account ID Input */}
          <div className="flex items-center gap-2 p-2 rounded shadow-sm border bg-white/90 backdrop-blur border-slate-200">
            <span className="text-xs text-slate-500">账号ID:</span>
            <input
              type="text"
              defaultValue={cloudSync.getAccountId() || ''}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const accountId = (e.target as HTMLInputElement).value.trim();
                  if (accountId) {
                    // Set account ID
                    cloudSync.setAccountId(accountId);

                    // Load all projects from this account
                    const cloudProjects = await cloudSync.loadAccountProjects(accountId);

                    if (cloudProjects.length > 0) {
                      // Merge cloud projects with local
                      loadCloudProjects(cloudProjects);
                      alert(`✅ 已连接账号: ${accountId}\n成功加载 ${cloudProjects.length} 个项目`);
                    } else {
                      // New account, just set it
                      alert(`✅ 账号已设置: ${accountId}\n\n你的项目将自动同步到此账号`);
                    }
                  }
                }
              }}
              onBlur={(e) => {
                const accountId = e.target.value.trim();
                if (accountId && accountId !== cloudSync.getAccountId()) {
                  cloudSync.setAccountId(accountId);
                }
              }}
              placeholder="输入账号ID"
              className="text-xs font-mono bg-transparent border-none outline-none w-24 text-slate-700"
            />
          </div>

          {/* Sync Status Badge */}
          {cloudSync.status.isSyncing ? (
            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200">🔄 同步中</span>
          ) : cloudSync.status.lastSyncTime ? (
            <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded border border-green-200" title={`最后同步: ${cloudSync.status.lastSyncTime.toLocaleString()}`}>
              ✓ 已同步
            </span>
          ) : null}
        </div>

        {/* Controls Bar: Undo/Redo + Measurements + Export */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          {/* PNG Export Button */}
          <button
            onClick={async () => {
              try {
                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                const filename = `${currentProject.name}-${timestamp}.png`;
                await exportCanvasAsPNG('room-canvas', filename, showMeasurements, setShowMeasurements);
              } catch (error) {
                console.error('❌ 导出失败:', error);
                alert('导出PNG失败，请重试。详情请查看控制台。');
              }
            }}
            className="p-2 rounded shadow-sm border bg-white/90 backdrop-blur text-slate-600 border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium"
            title="导出为PNG"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>导出PNG</span>
          </button>

          {/* Measurement Toggle */}
          <button
            onClick={() => setShowMeasurements(!showMeasurements)}
            className={`p-2 rounded shadow-sm border transition-colors flex items-center gap-2 text-sm font-medium ${showMeasurements
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white/90 backdrop-blur text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            title="显示距离测量"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H3" /><path d="M10 12h-2" /><path d="M10 6v8" /><path d="M21 18H3" /><path d="M14 18v-8" /><path d="M14 12h2" /></svg>
            <span>{showMeasurements ? '隐藏距离' : '显示距离'}</span>
          </button>

          {/* Undo/Redo Group */}
          <div className="flex bg-white/90 backdrop-blur border border-slate-200 rounded shadow-sm p-1 h-[38px] items-center">
            <button
              onClick={undo}
              disabled={historyIndex === 0}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1"></div>
            <button
              onClick={redo}
              disabled={historyIndex === history.length - 1}
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7" /></svg>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="absolute top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded shadow-lg flex items-center gap-2 pointer-events-auto">
              <span>⚠️ {errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-900 ml-2">×</button>
            </div>
          </div>
        )}

        <RoomCanvas
          dimensions={dimensions}
          onDimensionsChange={setDimensions}
          items={items}
          onItemsChange={handleItemsChange}
          selectedId={selectedId}
          onSelect={setSelectedId}
          showMeasurements={showMeasurements}
        />

        {/* Info overlay */}
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <div className="bg-white/90 backdrop-blur border border-slate-200 p-2 rounded text-[10px] text-slate-400 shadow-sm">
            鼠标：拖动移动 • 点击选择
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;