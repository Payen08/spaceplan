import React, { useState, useEffect } from 'react';
import { Dimensions, FurnitureItem, FurnitureType, Project } from '../types';
import { ShareMode } from '../hooks/useShareMode';
import { FURNITURE_PRESETS, ROOM_TYPES } from '../constants';

interface SidebarProps {
  dimensions: Dimensions;
  onDimensionsChange: (d: Dimensions) => void;
  onAddItem: (item: Partial<FurnitureItem>) => void;
  selectedItem: FurnitureItem | null;
  onUpdateItem: (item: FurnitureItem) => void;
  onDeleteItem: (id: string) => void;
  onGenerateAI: (description: string, roomType: string) => void;
  isGenerating: boolean;
  projects: Project[];
  currentProject: Project;
  onCreateProject: () => void;
  onSwitchProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  cloudSync: ReturnType<typeof import('../hooks/useCloudSync').useCloudSync>;
  shareMode: ShareMode;
  isReadOnly: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  dimensions,
  onDimensionsChange,
  onAddItem,
  selectedItem,
  onUpdateItem,
  onDeleteItem,
  onGenerateAI,
  isGenerating,
  projects,
  currentProject,
  onCreateProject,
  onSwitchProject,
  onRenameProject,
  onDeleteProject,
  cloudSync,
  shareMode,
  isReadOnly
}) => {
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(currentProject.name);
  const [activeTab] = useState<'build' | 'ai'>('build');
  const [prompt, setPrompt] = useState('');
  const [roomType, setRoomType] = useState(ROOM_TYPES[0]);

  // Local state for room dimension inputs
  const [widthInput, setWidthInput] = useState((Math.round(dimensions.width * 1000)).toString());
  const [lengthInput, setLengthInput] = useState((Math.round(dimensions.length * 1000)).toString());

  // Local state for rotation input editing
  const [rotationInput, setRotationInput] = useState('0');

  // Local state for light range input
  const [lightRangeInput, setLightRangeInput] = useState('');

  // Sync with external dimension changes
  useEffect(() => {
    setWidthInput((Math.round(dimensions.width * 1000)).toString());
    setLengthInput((Math.round(dimensions.length * 1000)).toString());
  }, [dimensions.width, dimensions.length]);

  // Sync light range input with selected item
  useEffect(() => {
    if (selectedItem?.lightRange !== undefined) {
      setLightRangeInput(selectedItem.lightRange.toString());
    } else {
      setLightRangeInput('');
    }
  }, [selectedItem?.id, selectedItem?.lightRange]);

  // Sync rotation input with selected item
  useEffect(() => {
    if (selectedItem) {
      setRotationInput(selectedItem.rotation.toString());
    }
  }, [selectedItem?.id]);

  // Convert meters to mm for display
  const toMM = (val: number) => Math.round(val * 1000);

  // Handle room dimension changes (Input is mm, convert to meters)
  const handleDimChange = (val: string, field: 'width' | 'length') => {
    const mm = parseFloat(val);
    if (!isNaN(mm) && mm > 0) {
      onDimensionsChange({ ...dimensions, [field]: mm / 1000 });
    }
  };

  // Handle item dimension changes (Input is mm/degrees, convert mm to meters)
  const handleItemDimChange = (val: string, field: 'width' | 'depth' | 'rotation' | 'lightRange') => {
    if (!selectedItem) return;

    // Allow empty string temporarily (will reset on blur)
    if (val === '') {
      return;
    }

    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      // lightRange is in meters, width/depth entered in mm but stored in meters
      let finalVal = num;
      if (field === 'width' || field === 'depth') finalVal = num / 1000;
      // rotation and lightRange (if we treat input as meters) stay as is
      // Let's decide lightRange input is in Meters for simplicity as ranges are large? 
      // Or keeping consistency: MM. Let's do Meters for Range as it's easier (e.g. 1.5m)

      onUpdateItem({ ...selectedItem, [field]: finalVal });
    }
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col shadow-lg z-10">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2">
          <span className="text-indigo-600">▪</span> SpacePlan AI
        </h1>
        <p className="text-xs text-slate-500 mb-3">智能室内空间布局设计</p>

        {/* Project Selector */}
        <div className="flex gap-2 items-center">
          {isEditingProjectName ? (
            <input
              type="text"
              value={editingProjectName}
              onChange={(e) => setEditingProjectName(e.target.value)}
              onBlur={() => {
                if (editingProjectName.trim()) {
                  onRenameProject(currentProject.id, editingProjectName.trim());
                  setIsEditingProjectName(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editingProjectName.trim()) {
                  onRenameProject(currentProject.id, editingProjectName.trim());
                  setIsEditingProjectName(false);
                } else if (e.key === 'Escape') {
                  setEditingProjectName(currentProject.name);
                  setIsEditingProjectName(false);
                }
              }}
              autoFocus
              className="flex-1 px-2 py-1.5 text-sm border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          ) : (
            <select
              value={currentProject.id}
              onChange={(e) => onSwitchProject(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              setEditingProjectName(currentProject.name);
              setIsEditingProjectName(!isEditingProjectName);
            }}
            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="重命名项目"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          {!isReadOnly && cloudSync.getAccountId() && (
            <button
              onClick={async () => {
                const updatedProject = { ...currentProject, dimensions, updatedAt: Date.now() };
                const success = await cloudSync.saveToCloud(updatedProject);
                alert(success ? '已保存到云端' : '保存失败：' + (cloudSync.status.syncError || '未知错误'));
              }}
              disabled={cloudSync.status.isSyncing}
              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded text-sm font-medium transition-colors"
              title="保存到云端"
            >
              {cloudSync.status.isSyncing ? '保存中' : '保存'}
            </button>
          )}
          <button
            onClick={() => onCreateProject()}
            className="p-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
            title="新建项目"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={() => onDeleteProject(currentProject.id)}
            disabled={projects.length <= 1}
            className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="删除项目"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs - AI tab hidden */}
      <div className="flex border-b border-slate-200">
        <div className="flex-1 py-3 text-sm font-medium text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 text-center">
          构建与编辑
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ROOM DIMENSIONS */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">房间尺寸 (mm)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">宽度</label>
              <input
                type="number"
                step="100"
                min="100"
                value={widthInput}
                onChange={(e) => setWidthInput(e.target.value)}
                onBlur={(e) => handleDimChange(e.target.value, 'width')}
                onKeyDown={(e) => e.key === 'Enter' && handleDimChange((e.target as HTMLInputElement).value, 'width')}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">长度</label>
              <input
                type="number"
                step="100"
                min="100"
                value={lengthInput}
                onChange={(e) => setLengthInput(e.target.value)}
                onBlur={(e) => handleDimChange(e.target.value, 'length')}
                onKeyDown={(e) => e.key === 'Enter' && handleDimChange((e.target as HTMLInputElement).value, 'length')}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {activeTab === 'build' && (
          <>
            {/* SELECTED ITEM EDIT */}
            {selectedItem ? (
              <div className={`p-3 rounded-lg border space-y-3 animate-in fade-in zoom-in-95 duration-200 ${selectedItem.locked ? 'bg-slate-100 border-slate-300' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">编辑选中物品</h3>
                    {selectedItem.locked && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">锁定</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onUpdateItem({ ...selectedItem, locked: !selectedItem.locked })}
                      className={`p-1.5 rounded transition-colors ${selectedItem.locked ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-white text-slate-400 hover:text-indigo-600'}`}
                      title={selectedItem.locked ? "解锁位置" : "锁定位置"}
                    >
                      {selectedItem.locked ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
                      )}
                    </button>
                    <button
                      onClick={() => onDeleteItem(selectedItem.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-[10px] text-indigo-700 mb-1">名称</label>
                  <input
                    type="text"
                    value={selectedItem.name}
                    onChange={(e) => onUpdateItem({ ...selectedItem, name: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-indigo-200 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder="输入家具名称"
                  />
                </div>

                <div className={`grid grid-cols-2 gap-2 ${selectedItem.locked ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div>
                    <label className="block text-[10px] text-indigo-700 mb-1">宽度 (mm)</label>
                    <input
                      type="number"
                      step="10"
                      min="10"
                      value={toMM(selectedItem.width)}
                      onChange={(e) => handleItemDimChange(e.target.value, 'width')}
                      className="w-full px-2 py-1 bg-white border border-indigo-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-indigo-700 mb-1">深度 (mm)</label>
                    <input
                      type="number"
                      step="10"
                      min="10"
                      value={toMM(selectedItem.depth)}
                      onChange={(e) => handleItemDimChange(e.target.value, 'depth')}
                      className="w-full px-2 py-1 bg-white border border-indigo-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-indigo-700 mb-1">旋转 (°)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={rotationInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRotationInput(val);
                          if (val !== '') {
                            const num = parseFloat(val);
                            if (!isNaN(num)) {
                              onUpdateItem({ ...selectedItem, rotation: num });
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (val === '' || isNaN(parseFloat(val))) {
                            setRotationInput('0');
                            onUpdateItem({ ...selectedItem, rotation: 0 });
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-2 py-1 bg-white border border-indigo-200 rounded text-xs"
                      />
                      <button
                        onClick={() => onUpdateItem({ ...selectedItem, rotation: (selectedItem.rotation + 90) % 360 })}
                        className="px-2 bg-indigo-200 hover:bg-indigo-300 rounded text-xs text-indigo-800"
                        title="Rotate +90"
                      >
                        ↻
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-indigo-700 mb-1">颜色</label>
                    <input
                      type="color"
                      value={selectedItem.color}
                      onChange={(e) => onUpdateItem({ ...selectedItem, color: e.target.value })}
                      className="w-full h-[26px] p-0 border border-indigo-200 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Light Specific Controls */}
                {selectedItem.type === FurnitureType.LIGHT && (
                  <div className="pt-2 border-t border-indigo-100 mt-2">
                    <label className="flex justify-between text-[10px] text-indigo-700 mb-1">
                      <span>照射半径 (米)</span>
                      <span className="font-mono text-indigo-500">{selectedItem.lightRange || 2}m</span>
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="range"
                        min="0.5"
                        max="5"
                        step="0.1"
                        value={selectedItem.lightRange || 2}
                        onChange={(e) => handleItemDimChange(e.target.value, 'lightRange')}
                        className="flex-1 h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="10"
                        value={lightRangeInput}
                        onChange={(e) => {
                          setLightRangeInput(e.target.value);
                          handleItemDimChange(e.target.value, 'lightRange');
                        }}
                        className="w-12 px-1 py-0.5 bg-white border border-indigo-200 rounded text-xs text-center"
                      />
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center">
                <span className="text-xs text-slate-400">在画布上点击选择物品进行编辑</span>
              </div>
            )}

            {/* ADD FURNITURE */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">家具库</h2>
              <div className="grid grid-cols-2 gap-2">
                {FURNITURE_PRESETS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAddItem(item)}
                    className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center group"
                  >
                    <div className="w-8 h-8 rounded mb-2 border border-slate-300 flex items-center justify-center relative" style={{ backgroundColor: item.color }}>
                      {/* Mini Preview for Lights */}
                      {item.type === FurnitureType.LIGHT && (
                        <div className={`rounded-full border border-slate-400/50 ${item.name?.includes('筒灯') ? 'w-4 h-4 border-2' : 'w-6 h-6'}`}>
                          {/* Crosshair for non-downlight */}
                          {!item.name?.includes('筒灯') && (
                            <>
                              <div className="absolute top-1/2 left-1 w-6 h-[1px] bg-slate-400/50 -translate-y-1/2 -translate-x-1"></div>
                              <div className="absolute left-1/2 top-1 w-[1px] h-6 bg-slate-400/50 -translate-x-1/2 -translate-y-1"></div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-700">{item.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {toMM(item.width || 0)}x{toMM(item.depth || 0)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-md">
              <h3 className="text-sm font-bold mb-1">AI 室内设计师</h3>
              <p className="text-xs opacity-90">描述您的需求，Gemini 将为您生成最佳布局方案。</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">房间类型</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">需求描述</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：这是一个给两个人使用的书房，需要两个升降桌，一个书架，以及一个休息用的小沙发。"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm h-32 resize-none focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => onGenerateAI(prompt, roomType)}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  思考中...
                </>
              ) : (
                <>
                  <span>✨</span> 生成布局
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center">Powered by Google Gemini</p>
          </div>
        )}
      </div>
    </div>
  );
};