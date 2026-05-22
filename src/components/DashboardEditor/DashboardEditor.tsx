import React, { useState, useRef, useEffect } from 'react';
import { useStore, WidgetConfig } from '../../store/useStore';
import { ChartCanvas } from '../ChartCanvas/ChartCanvas';
import { Trash2, GripHorizontal } from 'lucide-react';
import Markdown from 'react-markdown';

export function DashboardEditor() {
  const widgets = useStore(s => s.widgets);
  const updateWidget = useStore(s => s.updateWidget);
  const removeWidget = useStore(s => s.removeWidget);
  const isPresentationMode = useStore(s => s.isPresentationMode);
  const selectedDataValue = useStore(s => s.selectedDataValue);
  const setSelectedDataValue = useStore(s => s.setSelectedDataValue);

  const containerRef = useRef<HTMLDivElement>(null);
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ w: 0, h: 0, mouseX: 0, mouseY: 0, widgetX: 0, widgetY: 0 });

  const GRID_SIZE = 20;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPresentationMode) return;
      
      // If we have a selected widget and it's NOT actively being typed into
      if (selectedWidgetId && (e.key === 'Backspace' || e.key === 'Delete')) {
        // Check if the active element is an input/textarea
        const activeElement = document.activeElement;
        const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        
        if (!isTyping) {
          removeWidget(selectedWidgetId);
          setSelectedWidgetId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetId, isPresentationMode, removeWidget]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (draggingId) {
        let newX = e.clientX - rect.left + containerRef.current.scrollLeft - dragOffset.x;
        let newY = e.clientY - rect.top + containerRef.current.scrollTop - dragOffset.y;
        
        // Snap to grid
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

        updateWidget(draggingId, { x: Math.max(0, newX), y: Math.max(0, newY) });
      } else if (resizingId && resizeHandle) {
        const deltaX = e.clientX - resizeStart.mouseX;
        const deltaY = e.clientY - resizeStart.mouseY;

        let newWidth = resizeStart.w;
        let newHeight = resizeStart.h;
        let newX = resizeStart.widgetX;
        let newY = resizeStart.widgetY;

        const widget = widgets.find(w => w.id === resizingId);
        const minWidth = 200;
        const minHeight = widget?.type === 'text' ? 40 : 150;

        if (resizeHandle.includes('e')) {
          newWidth = Math.round((resizeStart.w + deltaX) / GRID_SIZE) * GRID_SIZE;
          newWidth = Math.max(minWidth, newWidth);
        } else if (resizeHandle.includes('w')) {
          let targetX = resizeStart.widgetX + deltaX;
          targetX = Math.round(targetX / GRID_SIZE) * GRID_SIZE;
          targetX = Math.max(0, targetX);
          targetX = Math.min(targetX, resizeStart.widgetX + resizeStart.w - minWidth);
          newX = targetX;
          newWidth = resizeStart.widgetX + resizeStart.w - newX;
        }

        if (resizeHandle.includes('s')) {
          newHeight = Math.round((resizeStart.h + deltaY) / GRID_SIZE) * GRID_SIZE;
          newHeight = Math.max(minHeight, newHeight);
        } else if (resizeHandle.includes('n')) {
          let targetY = resizeStart.widgetY + deltaY;
          targetY = Math.round(targetY / GRID_SIZE) * GRID_SIZE;
          targetY = Math.max(0, targetY);
          targetY = Math.min(targetY, resizeStart.widgetY + resizeStart.h - minHeight);
          newY = targetY;
          newHeight = resizeStart.widgetY + resizeStart.h - newY;
        }

        updateWidget(resizingId, { 
          width: newWidth, 
          height: newHeight,
          x: newX,
          y: newY
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      setResizingId(null);
      setResizeHandle(null);
    };

    if (draggingId || resizingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, resizingId, dragOffset, resizeStart, updateWidget]);

  const handleDragStart = (e: React.MouseEvent, id: string, x: number, y: number) => {
    if (isPresentationMode) return;
    e.stopPropagation();
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDraggingId(id);
      setDragOffset({ 
        x: e.clientX - rect.left + containerRef.current.scrollLeft - x, 
        y: e.clientY - rect.top + containerRef.current.scrollTop - y 
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, handle: string, w: number, h: number, widgetX: number, widgetY: number) => {
    if (isPresentationMode) return;
    e.stopPropagation();
    setResizingId(id);
    setResizeHandle(handle);
    setResizeStart({ w, h, mouseX: e.clientX, mouseY: e.clientY, widgetX, widgetY });
  };

  return (
    <div 
      id="dashboard-editor-scroll-area"
      ref={containerRef}
      onClick={() => setSelectedWidgetId(null)}
      className={`relative w-full h-full overflow-auto ${!isPresentationMode ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNjYmQ1ZTEiLz48L3N2Zz4=")] dark:bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzMzQxNTUiLz48L3N2Zz4=")]' : 'bg-slate-50 dark:bg-slate-950'}`}
    >
      {widgets.map(widget => (
        <div
          key={widget.id}
          onClick={(e) => {
            e.stopPropagation();
            if (!isPresentationMode) setSelectedWidgetId(widget.id);
          }}
          className={`absolute bg-white dark:bg-slate-900 border ${
            selectedWidgetId === widget.id && !isPresentationMode
              ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-500/50' 
              : isPresentationMode 
                ? 'border-slate-200 dark:border-slate-800' 
                : 'border-slate-300 dark:border-slate-700'
          } rounded-lg shadow-xl flex flex-col overflow-hidden transition-shadow ${draggingId === widget.id ? 'shadow-2xl z-50 opacity-90' : 'z-10 hover:z-20'}`}
          style={{
            left: widget.x,
            top: widget.y,
            width: widget.width,
            height: widget.height,
          }}
        >
          {/* Header */}
          {!isPresentationMode && widget.type !== 'text' && (
            <div 
              className="h-8 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-2 cursor-move shrink-0"
              onMouseDown={(e) => handleDragStart(e, widget.id, widget.x, widget.y)}
            >
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <GripHorizontal size={14} />
                <span className="text-xs font-semibold">{widget.type === 'chart' ? 'Chart Widget' : widget.type === 'table' ? 'Table Widget' : 'Text Widget'}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Remove widget"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          {/* Content */}
          <div 
            className={`flex-1 p-2 relative overflow-hidden flex flex-col ${!isPresentationMode && widget.type === 'text' ? 'cursor-move' : ''}`}
            onMouseDown={(e) => {
              if (!isPresentationMode && widget.type === 'text') {
                handleDragStart(e, widget.id, widget.x, widget.y);
              }
            }}
          >
            {widget.type === 'chart' && widget.libraryId && (
              <ChartCanvas libraryId={widget.libraryId} config={widget.data} className="w-full h-full" />
            )}
            {widget.type === 'table' && widget.data && (
              <div className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                <div className="overflow-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 text-slate-700 dark:text-slate-300 shadow-sm z-10">
                      <tr>
                        {(widget.data.headers || []).map((h: string, i: number) => (
                          <th key={i} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(widget.data.data || []).slice(0, 100).map((row: any[], rowIndex: number) => {
                        const rowKeyStr = String(row[0]);
                        const isRowSelected = selectedDataValue !== null && row.some(cell => String(cell) === selectedDataValue);
                        return (
                          <tr 
                            key={rowIndex} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDataValue(selectedDataValue === rowKeyStr ? null : rowKeyStr);
                            }}
                            className={`transition-colors cursor-pointer ${isRowSelected ? 'bg-blue-100 dark:bg-blue-600/40' : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                          >
                            {row.map((cell: any, cellIndex: number) => {
                              const cellStr = String(cell);
                              return (
                                <td 
                                  key={cellIndex} 
                                  className={`p-2 border-b border-r border-slate-200 dark:border-slate-700 whitespace-nowrap ${
                                    isRowSelected
                                      ? 'text-slate-800 dark:text-slate-200 font-medium'
                                      : 'text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {cellStr}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {(widget.data.data || []).length > 100 && (
                    <div className="p-2 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 sticky bottom-0">
                      Showing first 100 rows of {(widget.data.data || []).length}
                    </div>
                  )}
                </div>
              </div>
            )}
            {widget.type === 'text' && (
              isPresentationMode ? (
                <div className="w-full h-full overflow-auto text-slate-800 dark:text-slate-200 text-sm prose dark:prose-invert max-w-none custom-scrollbar">
                  <Markdown>{widget.data}</Markdown>
                </div>
              ) : (
                <textarea
                  value={widget.data}
                  onChange={(e) => updateWidget(widget.id, { data: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="w-full h-full bg-transparent text-slate-800 dark:text-slate-200 text-sm resize-none focus:outline-none custom-scrollbar cursor-text"
                  placeholder="Enter text here (Markdown supported)..."
                />
              )
            )}
          </div>

          {/* Resizers */}
          {!isPresentationMode && (
            <>
              {/* Edges */}
              <div className="absolute top-0 left-0 right-0 h-1.5 cursor-n-resize z-20" onMouseDown={(e) => handleResizeStart(e, widget.id, 'n', widget.width, widget.height, widget.x, widget.y)} />
              <div className="absolute bottom-0 left-0 right-0 h-1.5 cursor-s-resize z-20" onMouseDown={(e) => handleResizeStart(e, widget.id, 's', widget.width, widget.height, widget.x, widget.y)} />
              <div className="absolute top-0 bottom-0 left-0 w-1.5 cursor-w-resize z-20" onMouseDown={(e) => handleResizeStart(e, widget.id, 'w', widget.width, widget.height, widget.x, widget.y)} />
              <div className="absolute top-0 bottom-0 right-0 w-1.5 cursor-e-resize z-20" onMouseDown={(e) => handleResizeStart(e, widget.id, 'e', widget.width, widget.height, widget.x, widget.y)} />
              
              {/* Corners */}
              <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-30" onMouseDown={(e) => handleResizeStart(e, widget.id, 'nw', widget.width, widget.height, widget.x, widget.y)} />
              <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-30" onMouseDown={(e) => handleResizeStart(e, widget.id, 'ne', widget.width, widget.height, widget.x, widget.y)} />
              <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-30" onMouseDown={(e) => handleResizeStart(e, widget.id, 'sw', widget.width, widget.height, widget.x, widget.y)} />
              <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-30 flex items-end justify-end" onMouseDown={(e) => handleResizeStart(e, widget.id, 'se', widget.width, widget.height, widget.x, widget.y)}>
                <svg viewBox="0 0 10 10" className="w-3 h-3 text-slate-400 dark:text-slate-500 opacity-50 pointer-events-none mb-0.5 mr-0.5">
                  <path d="M 8 10 L 10 10 L 10 8 M 5 10 L 10 10 L 10 5 M 2 10 L 10 10 L 10 2" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
            </>
          )}
        </div>
      ))}
      
      {widgets.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm pointer-events-none">
          No widgets added yet. Add them from the Dashboard node.
        </div>
      )}
    </div>
  );
}
