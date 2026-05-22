import React, { useEffect, useRef, useState } from 'react';
import { loadLibrary, libraries } from '../../services/chartLibs';
import { ChartConfig } from '../../types/visualization';
import { useStore } from '../../store/useStore';

interface ChartCanvasProps {
  libraryId: string;
  config: ChartConfig | null;
  className?: string;
}

export function ChartCanvas({ libraryId, config, className = '' }: ChartCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDataValue = useStore(s => s.selectedDataValue);
  const setSelectedDataValue = useStore(s => s.setSelectedDataValue);

  useEffect(() => {
    let mounted = true;
    setIsLoaded(false);
    setError(null);
    
    loadLibrary(libraryId)
      .then(() => {
        if (mounted) setIsLoaded(true);
      })
      .catch(err => {
        if (mounted) setError(err.message);
      });
    return () => { mounted = false; };
  }, [libraryId]);

  useEffect(() => {
    if (!isLoaded || !config) return;

    try {
      if (libraryId === 'echarts' && containerRef.current) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.dispose();
        }
        const echarts = (window as any).echarts;
        const chart = echarts.init(containerRef.current);
        chart.setOption(config.data);
        chartInstanceRef.current = chart;
        
        chart.on('click', (params: any) => {
          const valStr = String(params.name || (Array.isArray(params.value) ? params.value[0] : params.value));
          if (valStr) {
            const currentVal = useStore.getState().selectedDataValue;
            useStore.getState().setSelectedDataValue(currentVal === valStr ? null : valStr);
          }
        });

        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);
        
        // Setup ResizeObserver for container
        const resizeObserver = new ResizeObserver(() => {
          chart.resize();
        });
        resizeObserver.observe(containerRef.current);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          resizeObserver.disconnect();
          chart.dispose();
        };
      } 
      else if (libraryId === 'chartjs' && canvasRef.current) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }
        const Chart = (window as any).Chart;
        chartInstanceRef.current = new Chart(canvasRef.current, {
          type: config.type,
          data: config.data,
          options: { 
            ...config.options, 
            responsive: true, 
            maintainAspectRatio: false,
            onClick: (event: any, elements: any[]) => {
              if (elements && elements.length > 0) {
                const firstElement = elements[0];
                const index = firstElement.index;
                const label = chartInstanceRef.current.data.labels[index];
                if (label !== undefined) {
                  const valStr = String(label);
                  const currentVal = useStore.getState().selectedDataValue;
                  useStore.getState().setSelectedDataValue(currentVal === valStr ? null : valStr);
                }
              }
            }
          }
        });
        return () => {
          if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        };
      }
      else if (libraryId === 'plotly' && containerRef.current) {
        const Plotly = (window as any).Plotly;
        const plotlyDiv = containerRef.current;
        Plotly.newPlot(plotlyDiv, config.data, { ...config.options, autosize: true }, { responsive: true });
        
        (plotlyDiv as any).on('plotly_click', (data: any) => {
          if (data.points && data.points.length > 0) {
            const point = data.points[0];
            const valStr = String(point.label || point.x);
            if (valStr && valStr !== 'undefined') {
              const currentVal = useStore.getState().selectedDataValue;
              useStore.getState().setSelectedDataValue(currentVal === valStr ? null : valStr);
            }
          }
        });

        const resizeObserver = new ResizeObserver(() => {
          Plotly.Plots.resize(plotlyDiv);
        });
        resizeObserver.observe(plotlyDiv);
        
        return () => {
          resizeObserver.disconnect();
          Plotly.purge(plotlyDiv);
        };
      }
    } catch (err: any) {
      console.error('Chart rendering error:', err);
      setError(err.message);
    }
  }, [isLoaded, config, libraryId]);

  useEffect(() => {
    if (!isLoaded || !chartInstanceRef.current) return;

    if (libraryId === 'echarts') {
      const chart = chartInstanceRef.current;
      chart.dispatchAction({ type: 'downplay' });
      if (selectedDataValue !== null) {
        chart.dispatchAction({
          type: 'highlight',
          name: selectedDataValue,
        });
      }
    }
    // Note: Chart.js and Plotly require more complex manual dataset updates for highlighting, 
    // which might require deep cloning and re-rendering config. ECharts supports it natively.
  }, [selectedDataValue, isLoaded, libraryId]);

  if (error) {
    return <div className={`flex items-center justify-center text-red-500 dark:text-red-400 text-xs h-full w-full ${className}`}>{error}</div>;
  }

  if (!isLoaded) {
    return <div className={`flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs h-full w-full ${className}`}>Loading {libraries[libraryId]?.name}...</div>;
  }

  if (!config) {
    return <div className={`flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs h-full w-full ${className}`}>No configuration</div>;
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {libraryId === 'chartjs' ? (
        <canvas ref={canvasRef} className="w-full h-full" />
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
}
