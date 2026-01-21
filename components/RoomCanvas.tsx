import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Dimensions, FurnitureItem, FurnitureType } from '../types';
import { PIXELS_PER_METER } from '../constants';

interface RoomCanvasProps {
  dimensions: Dimensions;
  onDimensionsChange: (dimensions: Dimensions) => void;
  items: FurnitureItem[];
  onItemsChange: (items: FurnitureItem[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showMeasurements?: boolean;
}

interface EditModalProps {
  isOpen: boolean;
  title: string;
  initialValue: number; // passed in meters
  onClose: () => void;
  onConfirm: (val: number) => void; // returns meters
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, title, initialValue, onClose, onConfirm }) => {
  // Convert initial meter value to mm for display
  const [value, setValue] = useState((Math.round(initialValue * 1000)).toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue((Math.round(initialValue * 1000)).toString());
      // Delay focus slightly to ensure render
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;

    // Convert input mm back to meters
    onConfirm(num / 1000);
  };

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-white p-5 rounded-xl shadow-2xl border border-slate-200 w-80 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-slate-800 mb-3">{title}</h3>
        <div className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              step="1"
              className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-800 font-mono text-lg"
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') onClose();
              }}
            />
            <span className="absolute right-3 top-3 text-slate-400 text-sm font-medium">mm</span>
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
            💡 输入数值单位为 <strong>毫米 (mm)</strong>
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-transform active:scale-95"
            >
              确认修改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RoomCanvas: React.FC<RoomCanvasProps> = ({
  dimensions,
  onDimensionsChange,
  items,
  onItemsChange,
  selectedId,
  onSelect,
  showMeasurements = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    title: string;
    initialValue: number;
    onConfirm: (val: number) => void;
  }>({
    isOpen: false,
    title: '',
    initialValue: 0,
    onConfirm: () => { }
  });

  // Helper to sync D3 drag behavior with React state
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Ensure layer order: Grid -> Guides -> Furniture -> Measurements (Top)
    if (svg.select('.grid-layer').empty()) svg.append('g').attr('class', 'grid-layer');
    if (svg.select('.guides-layer').empty()) svg.append('g').attr('class', 'guides-layer');
    if (svg.select('.furniture-layer').empty()) svg.append('g').attr('class', 'furniture-layer');
    if (svg.select('.measurements-layer').empty()) svg.append('g').attr('class', 'measurements-layer');

    const gLayer = svg.select('.furniture-layer');
    const mLayer = svg.select('.measurements-layer');
    const guidesLayer = svg.select('.guides-layer');

    // IMPORTANT: Always raise measurements layer to top to ensure it receives clicks
    mLayer.raise();

    // --- MEASUREMENTS RENDERING ---
    mLayer.selectAll('*').remove(); // Clear previous measurements

    if (showMeasurements && selectedId) {
      const selectedItem = items.find(i => i.id === selectedId);
      if (selectedItem) {
        // Calculate Center of Selected Item
        const cx1 = (selectedItem.x + selectedItem.width / 2) * PIXELS_PER_METER;
        const cy1 = (selectedItem.y + selectedItem.depth / 2) * PIXELS_PER_METER;

        // 1. Draw Lines to Walls
        const roomW = dimensions.width * PIXELS_PER_METER;
        const roomH = dimensions.length * PIXELS_PER_METER;

        const wallDistances = [
          { type: 'top', x: cx1, y: 0, val: selectedItem.y, label: '上方墙距' },
          { type: 'bottom', x: cx1, y: roomH, val: dimensions.length - (selectedItem.y + selectedItem.depth), label: '下方墙距' },
          { type: 'left', x: 0, y: cy1, val: selectedItem.x, label: '左侧墙距' },
          { type: 'right', x: roomW, y: cy1, val: dimensions.width - (selectedItem.x + selectedItem.width), label: '右侧墙距' }
        ];

        wallDistances.forEach(wall => {
          mLayer.append('line')
            .attr('x1', cx1)
            .attr('y1', cy1)
            .attr('x2', wall.x)
            .attr('y2', wall.y)
            .style('stroke', '#94a3b8')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '4,4')
            .style('opacity', 0.5)
            .style('pointer-events', 'none');

          // Wall distance label (Interactive)
          const labelGroup = mLayer.append('g')
            .attr('transform', `translate(${(cx1 + wall.x) / 2}, ${(cy1 + wall.y) / 2})`)
            .style('cursor', 'pointer');

          // Add invisible hit area for better clicking
          labelGroup.append('rect')
            .attr('x', -26)
            .attr('y', -12)
            .attr('width', 52)
            .attr('height', 24)
            .attr('rx', 6)
            .style('fill', '#ffffff')
            .style('stroke', '#cbd5e1')
            .style('stroke-width', 1)
            .style('filter', 'drop-shadow(0 2px 4px rgb(0 0 0 / 0.05))')
            // Binds click event to the rect for reliable hit testing
            .on('mouseover', function () { d3.select(this).style('stroke', '#3b82f6').style('stroke-width', 2); })
            .on('mouseout', function () { d3.select(this).style('stroke', '#cbd5e1').style('stroke-width', 1); })
            .on('click', (event) => {
              event.stopPropagation();
              event.preventDefault();

              // Prevent editing if locked (though measurement editing changes position, so we should block it)
              if (selectedItem.locked) return;

              setEditModal({
                isOpen: true,
                title: `修改${wall.label}`,
                initialValue: wall.val,
                onConfirm: (newVal) => {
                  let newX = selectedItem.x;
                  let newY = selectedItem.y;

                  // Adjust position based on wall
                  if (wall.type === 'top') newY = newVal;
                  if (wall.type === 'bottom') newY = dimensions.length - selectedItem.depth - newVal;
                  if (wall.type === 'left') newX = newVal;
                  if (wall.type === 'right') newX = dimensions.width - selectedItem.width - newVal;

                  // Boundary guard
                  newX = Math.max(0, Math.min(newX, dimensions.width - selectedItem.width));
                  newY = Math.max(0, Math.min(newY, dimensions.length - selectedItem.depth));

                  const updated = items.map(i => i.id === selectedId ? { ...i, x: newX, y: newY } : i);
                  onItemsChange(updated);
                  setEditModal(prev => ({ ...prev, isOpen: false }));
                }
              });
            });

          labelGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', '11px')
            .style('fill', '#475569')
            .style('font-family', 'monospace')
            .style('font-weight', 'bold')
            .style('pointer-events', 'none')
            // DISPLAY IN MM
            .text(`${(wall.val * 1000).toFixed(0)}`);
        });
      }
    }


    // --- MOVE BEHAVIOR WITH SMART SNAPPING ---
    const dragBehavior = d3.drag<SVGGElement, FurnitureItem>()
      .subject(function (event, d) {
        return { x: d.x * PIXELS_PER_METER, y: d.y * PIXELS_PER_METER };
      })
      .on('start', function (event, d) {
        if (!event.sourceEvent.defaultPrevented) {
          onSelect(d.id);
          d3.select(this).raise().classed('active', true);
          mLayer.raise();
        }
      })
      .on('drag', function (event, d) {
        if (d.locked) return; // LOCK LOGIC

        let newX = event.x / PIXELS_PER_METER;
        let newY = event.y / PIXELS_PER_METER;

        // 0. Setup Dimensions considering rotation
        const isRotated = d.rotation % 180 !== 0;
        const currentWidth = isRotated ? d.depth : d.width;
        const currentDepth = isRotated ? d.width : d.depth;

        // 1. Basic Grid Snap (Baseline)
        const gridSnap = 0.05; // 5cm
        newX = Math.round(newX / gridSnap) * gridSnap;
        newY = Math.round(newY / gridSnap) * gridSnap;

        // 2. Object Snapping Logic
        const SNAP_THRESHOLD_PX = 10;
        const SNAP_THRESHOLD = SNAP_THRESHOLD_PX / PIXELS_PER_METER;

        const guides: { x1: number, y1: number, x2: number, y2: number }[] = [];
        let snappedX = false;
        let snappedY = false;

        // Identify key points on the moving object
        const activeX = [newX, newX + currentWidth / 2, newX + currentWidth]; // Left, Center, Right
        const activeY = [newY, newY + currentDepth / 2, newY + currentDepth]; // Top, Center, Bottom

        // Iterate through other items
        for (const other of items) {
          if (other.id === d.id) continue;

          const otherRotated = other.rotation % 180 !== 0;
          const otherW = otherRotated ? other.depth : other.width;
          const otherH = otherRotated ? other.width : other.depth;

          const targetsX = [other.x, other.x + otherW / 2, other.x + otherW];
          const targetsY = [other.y, other.y + otherH / 2, other.y + otherH];

          // Check X Snap (Vertical Guidelines)
          if (!snappedX) {
            let minDeltaX = Infinity;
            let snapPos = 0;

            // Compare all active X points to all target X points
            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 3; j++) {
                const delta = targetsX[j] - activeX[i];
                if (Math.abs(delta) < Math.abs(minDeltaX)) {
                  minDeltaX = delta;
                  snapPos = targetsX[j];
                }
              }
            }

            if (Math.abs(minDeltaX) < SNAP_THRESHOLD) {
              newX += minDeltaX;
              snappedX = true;
              // Add vertical guideline
              guides.push({
                x1: snapPos * PIXELS_PER_METER, y1: 0,
                x2: snapPos * PIXELS_PER_METER, y2: dimensions.length * PIXELS_PER_METER
              });
            }
          }

          // Check Y Snap (Horizontal Guidelines)
          if (!snappedY) {
            let minDeltaY = Infinity;
            let snapPos = 0;

            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 3; j++) {
                const delta = targetsY[j] - activeY[i];
                if (Math.abs(delta) < Math.abs(minDeltaY)) {
                  minDeltaY = delta;
                  snapPos = targetsY[j];
                }
              }
            }

            if (Math.abs(minDeltaY) < SNAP_THRESHOLD) {
              newY += minDeltaY;
              snappedY = true;
              // Add horizontal guideline
              guides.push({
                x1: 0, y1: snapPos * PIXELS_PER_METER,
                x2: dimensions.width * PIXELS_PER_METER, y2: snapPos * PIXELS_PER_METER
              });
            }
          }

          // Optimization: If both snapped, break early? 
          if (snappedX && snappedY) break;
        }

        // 3. Render Guidelines
        guidesLayer.selectAll('*').remove();
        if (guides.length > 0) {
          guides.forEach(g => {
            guidesLayer.append('line')
              .attr('x1', g.x1).attr('y1', g.y1)
              .attr('x2', g.x2).attr('y2', g.y2)
              .style('stroke', '#f43f5e') // Rose-500
              .style('stroke-width', 1)
              .style('stroke-dasharray', '4,4');
          });
        }


        // 4. Boundary Check - Account for rotation
        const isRotated = d.rotation % 180 !== 0;
        const effectiveWidth = isRotated ? currentDepth : currentWidth;
        const effectiveDepth = isRotated ? currentWidth : currentDepth;

        const bounds = {
          minX: 0,
          maxX: dimensions.width - effectiveWidth,
          minY: 0,
          maxY: dimensions.length - effectiveDepth,
        };

        newX = Math.max(bounds.minX, Math.min(newX, bounds.maxX));
        newY = Math.max(bounds.minY, Math.min(newY, bounds.maxY));

        d3.select(this).attr('transform', `translate(${newX * PIXELS_PER_METER},${newY * PIXELS_PER_METER}) rotate(${d.rotation})`);

        d.x = newX;
        d.y = newY;
      })
      .on('end', function (event, d) {
        d3.select(this).classed('active', false);
        // Clear guidelines
        guidesLayer.selectAll('*').remove();

        // Update if moved
        const item = items.find(i => i.id === d.id);
        if (item && (item.x !== d.x || item.y !== d.y)) {
          const updatedItems = items.map(item =>
            item.id === d.id ? { ...item, x: d.x, y: d.y } : item
          );
          onItemsChange(updatedItems);
        }
      });

    // --- RESIZE BEHAVIOR ---
    const resizeBehavior = d3.drag<SVGCircleElement, FurnitureItem>()
      .subject(function (event, d) {
        return { x: d.width * PIXELS_PER_METER, y: d.depth * PIXELS_PER_METER };
      })
      .on('start', function (event) {
        event.sourceEvent.stopPropagation();
      })
      .on('drag', function (event, d) {
        if (d.locked) return; // LOCK LOGIC

        let newWidth = event.x / PIXELS_PER_METER;
        let newDepth = event.y / PIXELS_PER_METER;

        newWidth = Math.max(0.1, newWidth);
        newDepth = Math.max(0.1, newDepth);

        const snap = 0.05;
        newWidth = Math.round(newWidth / snap) * snap;
        newDepth = Math.round(newDepth / snap) * snap;

        d.width = newWidth;
        d.depth = newDepth;

        const group = d3.select(this.parentNode as SVGGElement);
        // Conditional update for rect/circle look
        group.select('rect')
          .attr('width', newWidth * PIXELS_PER_METER)
          .attr('height', newDepth * PIXELS_PER_METER)
          // Keep circle ratio if LIGHT
          .attr('rx', d.type === FurnitureType.LIGHT ? 999 : 4)
          .attr('ry', d.type === FurnitureType.LIGHT ? 999 : 4);

        group.select('text').attr('x', (newWidth * PIXELS_PER_METER) / 2).attr('y', (newDepth * PIXELS_PER_METER) / 2);

        // Reposition Light Decoration if exists
        group.select('.light-deco')
          .attr('transform', `translate(${(newWidth * PIXELS_PER_METER) / 2}, ${(newDepth * PIXELS_PER_METER) / 2})`);

        // Reposition Light Range if exists
        group.select('.light-range')
          .attr('cx', (newWidth * PIXELS_PER_METER) / 2)
          .attr('cy', (newDepth * PIXELS_PER_METER) / 2);

        d3.select(this).attr('cx', newWidth * PIXELS_PER_METER).attr('cy', newDepth * PIXELS_PER_METER);
      })
      .on('end', function (event, d) {
        const updatedItems = items.map(item =>
          item.id === d.id ? { ...item, width: d.width, depth: d.depth } : item
        );
        onItemsChange(updatedItems);
      });


    // --- RENDERING ---
    const groups = gLayer
      .selectAll<SVGGElement, FurnitureItem>('g.furniture-item')
      .data(items, (d) => d.id);

    // ENTER
    const groupsEnter = groups.enter()
      .append('g')
      .attr('class', 'furniture-item cursor-move')
      .attr('id', d => `item-${d.id}`);

    groupsEnter.append('rect')
      .attr('class', 'main-rect')
      .style('stroke', '#000')
      .style('stroke-width', 1)
      .style('fill-opacity', 0.8);

    // Add specific decoration for Lights
    const lightGroup = groupsEnter.append('g')
      .attr('class', 'light-deco')
      .style('pointer-events', 'none')
      .style('opacity', 0); // Hidden by default, shown via update selection

    // Generic light crosshair
    lightGroup.append('line').attr('class', 'light-x1').attr('stroke', 'rgba(0,0,0,0.3)').attr('stroke-width', 1);
    lightGroup.append('line').attr('class', 'light-x2').attr('stroke', 'rgba(0,0,0,0.3)').attr('stroke-width', 1);
    // Downlight concentric circle
    lightGroup.append('circle').attr('class', 'light-inner').attr('stroke', 'rgba(0,0,0,0.3)').attr('fill', 'none').attr('stroke-width', 1);

    // Text Label
    groupsEnter.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px')
      .style('pointer-events', 'none')
      .style('fill', '#1e293b');

    // Lock Icon
    groupsEnter.append('text')
      .attr('class', 'lock-icon')
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'hanging')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .text('🔒')
      .attr('x', 0)
      .attr('y', 2)
      .style('opacity', 0);

    // UPDATE + ENTER
    const groupsMerge = groupsEnter.merge(groups);

    groupsMerge
      .attr('transform', d => `translate(${d.x * PIXELS_PER_METER},${d.y * PIXELS_PER_METER}) rotate(${d.rotation})`)
      .style('cursor', d => d.locked ? 'not-allowed' : 'move')
      .call(dragBehavior as any);

    // Update Rect
    groupsMerge.select('rect.main-rect')
      .attr('width', d => d.width * PIXELS_PER_METER)
      .attr('height', d => d.depth * PIXELS_PER_METER)
      .attr('rx', d => d.type === FurnitureType.LIGHT ? 999 : 4)
      .attr('ry', d => d.type === FurnitureType.LIGHT ? 999 : 4)
      .style('fill', d => d.color)
      .style('stroke', d => d.id === selectedId ? '#2563eb' : (d.locked ? '#cbd5e1' : '#94a3b8')) // Gray border if locked
      .style('stroke-width', d => d.id === selectedId ? 2 : 1)
      .style('stroke-dasharray', d => d.type === 'DOOR' || d.locked ? '5,5' : 'none');

    // Update Light Decoration
    groupsMerge.select('.light-deco')
      .style('opacity', d => d.type === FurnitureType.LIGHT ? 1 : 0)
      .attr('transform', d => `translate(${(d.width * PIXELS_PER_METER) / 2}, ${(d.depth * PIXELS_PER_METER) / 2})`);

    // Standard Light: Show Crosshair
    groupsMerge.select('.light-x1')
      .attr('x1', d => d.type === FurnitureType.LIGHT && !d.name.includes('筒灯') ? -(d.width * PIXELS_PER_METER) / 2 : 0)
      .attr('x2', d => d.type === FurnitureType.LIGHT && !d.name.includes('筒灯') ? (d.width * PIXELS_PER_METER) / 2 : 0)
      .style('display', d => d.name.includes('筒灯') ? 'none' : 'block');
    groupsMerge.select('.light-x2')
      .attr('y1', d => d.type === FurnitureType.LIGHT && !d.name.includes('筒灯') ? -(d.depth * PIXELS_PER_METER) / 2 : 0)
      .attr('y2', d => d.type === FurnitureType.LIGHT && !d.name.includes('筒灯') ? (d.depth * PIXELS_PER_METER) / 2 : 0)
      .style('display', d => d.name.includes('筒灯') ? 'none' : 'block');

    // Downlight: Show Inner Circle
    groupsMerge.select('.light-inner')
      .attr('r', d => d.type === FurnitureType.LIGHT && d.name.includes('筒灯') ? (d.width * PIXELS_PER_METER) / 4 : 0)
      .style('display', d => d.name.includes('筒灯') ? 'block' : 'none');

    // --- LIGHT RANGE VISUALIZATION ---
    // Select existing ranges in the current group and bind data
    const lightRange = groupsMerge.selectAll('.light-range')
      .data(d => (d.id === selectedId && d.type === FurnitureType.LIGHT) ? [d] : []);

    lightRange.exit().remove();

    lightRange.enter()
      .append('circle')
      .attr('class', 'light-range')
      .style('pointer-events', 'none')
      .merge(lightRange as any)
      .attr('cx', d => (d.width * PIXELS_PER_METER) / 2)
      .attr('cy', d => (d.depth * PIXELS_PER_METER) / 2)
      .attr('r', d => (d.lightRange || 0) * PIXELS_PER_METER)
      .style('fill', '#fde047')
      .style('fill-opacity', 0.15)
      .style('stroke', '#eab308')
      .style('stroke-dasharray', '5,5')
      .style('stroke-opacity', 0.5);

    // Update Text
    groupsMerge.select('text')
      .attr('x', d => (d.width * PIXELS_PER_METER) / 2)
      .attr('y', d => (d.depth * PIXELS_PER_METER) / 2)
      .text(d => d.name)
      // Hide text for small lights (e.g. Downlights) to prevent clutter
      .style('opacity', d => (d.width < 0.3 && d.type === FurnitureType.LIGHT) ? 0 : 1);

    // Update Lock Icon
    groupsMerge.select('.lock-icon')
      .attr('x', d => d.width * PIXELS_PER_METER - 2)
      .style('opacity', d => d.locked ? 1 : 0);

    // --- RESIZE HANDLES ---
    // Only show handles if selected AND NOT LOCKED
    const handles = groupsMerge.selectAll<SVGCircleElement, FurnitureItem>('.resize-handle')
      .data(d => (d.id === selectedId && !d.locked) ? [d] : []);

    handles.exit().remove();

    handles.enter()
      .append('circle')
      .attr('class', 'resize-handle')
      .attr('r', 6)
      .style('fill', '#2563eb')
      .style('stroke', '#fff')
      .style('stroke-width', 2)
      .style('cursor', 'nwse-resize')
      .merge(handles)
      .attr('cx', d => d.width * PIXELS_PER_METER)
      .attr('cy', d => d.depth * PIXELS_PER_METER)
      .call(resizeBehavior as any);

    // EXIT
    groups.exit().remove();

  }, [items, dimensions, selectedId, onItemsChange, onSelect, showMeasurements]);

  // Grid rendering separate effect
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const gridSpacing = PIXELS_PER_METER / 2;
    const width = dimensions.width * PIXELS_PER_METER;
    const height = dimensions.length * PIXELS_PER_METER;

    if (svg.select('.grid-layer').empty()) svg.insert('g', ':first-child').attr('class', 'grid-layer');

    svg.select('.grid-layer').selectAll('*').remove();
    const gridLayer = svg.select('.grid-layer');

    for (let x = 0; x <= width; x += gridSpacing) {
      gridLayer.append('line')
        .attr('x1', x).attr('y1', 0).attr('x2', x).attr('y2', height)
        .style('stroke', x % PIXELS_PER_METER === 0 ? '#cbd5e1' : '#f1f5f9').style('stroke-width', 1);
    }
    for (let y = 0; y <= height; y += gridSpacing) {
      gridLayer.append('line')
        .attr('x1', 0).attr('y1', y).attr('x2', width).attr('y2', y)
        .style('stroke', y % PIXELS_PER_METER === 0 ? '#cbd5e1' : '#f1f5f9').style('stroke-width', 1);
    }
  }, [dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-100 overflow-auto flex items-center justify-center p-8 shadow-inner relative">
      <div
        id="room-canvas"
        className="bg-white shadow-2xl relative transition-all duration-300 ease-out"
        style={{
          width: dimensions.width * PIXELS_PER_METER,
          height: dimensions.length * PIXELS_PER_METER,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as Element).tagName === 'svg') {
            onSelect(null);
          }
        }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width * PIXELS_PER_METER}
          height={dimensions.length * PIXELS_PER_METER}
          className="block"
        >
          <g className="grid-layer" />
          <g className="guides-layer" />
          <g className="furniture-layer" />
          <g className="measurements-layer" />
        </svg>

        {/* Dimension Labels - CLICKABLE */}
        <div
          className="absolute -top-8 left-0 w-full flex justify-center cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            setEditModal({
              isOpen: true,
              title: '修改房间宽度',
              initialValue: dimensions.width,
              onConfirm: (val) => onDimensionsChange({ ...dimensions, width: val })
            });
          }}
        >
          <span className="bg-white/80 backdrop-blur px-2 py-1 rounded border border-transparent group-hover:border-indigo-200 group-hover:text-indigo-600 transition-all text-xs font-mono text-slate-500 shadow-sm">
            {(dimensions.width * 1000).toFixed(0)}mm
          </span>
        </div>

        <div
          className="absolute top-0 -left-8 h-full flex flex-col justify-center cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            setEditModal({
              isOpen: true,
              title: '修改房间长度',
              initialValue: dimensions.length,
              onConfirm: (val) => onDimensionsChange({ ...dimensions, length: val })
            });
          }}
        >
          <span className="bg-white/80 backdrop-blur px-1 py-2 rounded border border-transparent group-hover:border-indigo-200 group-hover:text-indigo-600 transition-all text-xs font-mono text-slate-500 shadow-sm" style={{ writingMode: 'vertical-rl' }}>
            {(dimensions.length * 1000).toFixed(0)}mm
          </span>
        </div>
      </div>

      {/* Modal is rendered relative to container but with absolute positioning to cover it */}
      <EditModal
        isOpen={editModal.isOpen}
        title={editModal.title}
        initialValue={editModal.initialValue}
        onClose={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={editModal.onConfirm}
      />
    </div>
  );
};