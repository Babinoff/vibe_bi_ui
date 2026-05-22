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

  const containerRef = useRef<HTMLDivElement>(null);
  
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ w: 0, h: 0, x: 0, y: 0 });

  const GRID_SIZE = 20;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (draggingId) {
        let newX = e.clientX - rect.left - dragOffset.x;
        let newY = e.clientY - rect.top - dragOffset.y;
        
        // Snap to grid
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;

        updateWidget(draggingId, { x: Math.max(0, newX), y: Math.max(0, newY) });
      } else if (resizingId) {
        let newWidth = resizeStart.w + (e.clientX - resizeStart.x);
        let newHeight = resizeStart.h + (e.clientY - resizeStart.y);

        // Snap to grid
        newWidth = Math.round(newWidth / GRID_SIZE) * GRID_SIZE;
        newHeight = Math.round(newHeight / GRID_SIZE) * GRID_SIZE;

        updateWidget(resizingId, { 
          width: Math.max(200, newWidth), 
          height: Math.max(150, newHeight) 
        });
      }
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      setResizingId(null);
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
    setDraggingId(id);
    setDragOffset({ x: e.clientX - x, y: e.clientY - y });
  };

  const handleResizeStart = (e: React.MouseEvent, id: string, w: number, h: number) => {
    if (isPresentationMode) return;
    e.stopPropagation();
    setResizingId(id);
    setResizeStart({ w, h, x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      id="dashboard-editor-scroll-area"
      ref={containerRef}
      className={`relative w-full h-full overflow-auto ${!isPresentationMode ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNjYmQ1ZTEiLz48L3N2Zz4=")] dark:bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzMzQxNTUiLz48L3N2Zz4=")]' : 'bg-slate-50 dark:bg-slate-950'}`}
    >
      {widgets.map(widget => (
        <div
          key={widget.id}
          className={`absolute bg-white dark:bg-slate-900 border ${isPresentationMode ? 'border-slate-200 dark:border-slate-800' : 'border-slate-300 dark:border-slate-700'} rounded-lg shadow-xl flex flex-col overflow-hidden transition-shadow ${draggingId === widget.id ? 'shadow-2xl z-50 opacity-90' : 'z-10 hover:z-20'}`}
          style={{
            left: widget.x,
            top: widget.y,
            width: widget.width,
            height: widget.height,
          }}
        >
          {/* Header */}
          {!isPresentationMode && (
            <div 
              className="h-8 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-2 cursor-move shrink-0"
              onMouseDown={(e) => handleDragStart(e, widget.id, widget.x, widget.y)}
            >
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <GripHorizontal size={14} />
                <span className="text-xs font-semibold">{widget.type === 'chart' ? 'Chart Widget' : widget.type === 'table' ? 'Table Widget' : 'Text Widget'}</span>
              </div>
              {widget.type !== 'chart' && widget.type !== 'table' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }}
                  className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Remove widget"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-2 relative overflow-hidden flex flex-col">
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
                      {(widget.data.data || []).slice(0, 100).map((row: any[], rowIndex: number) => (
                        <tr key={rowIndex} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          {row.map((cell: any, cellIndex: number) => (
                            <td key={cellIndex} className="p-2 border-b border-r border-slate-200 dark:border-slate-700 whitespace-nowrap text-slate-600 dark:text-slate-300">
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
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
                  className="w-full h-full bg-transparent text-slate-800 dark:text-slate-200 text-sm resize-none focus:outline-none custom-scrollbar"
                  placeholder="Enter text here (Markdown supported)..."
                />
              )
            )}
          </div>

          {/* Resizer */}
          {!isPresentationMode && (
            <div 
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={(e) => handleResizeStart(e, widget.id, widget.width, widget.height)}
            >
              <svg viewBox="0 0 10 10" className="w-full h-full text-slate-400 dark:text-slate-500 opacity-50">
                <path d="M 8 10 L 10 10 L 10 8 M 5 10 L 10 10 L 10 5 M 2 10 L 10 10 L 10 2" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
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
