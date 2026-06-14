import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MousePointer2, Square, Circle, Minus, Type, Pencil,
  Eraser, Trash2, Download, Palette,
} from 'lucide-react';

const TOOLS = [
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'rect', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'line', label: 'Line / Arrow', icon: Minus },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'pen', label: 'Freehand', icon: Pencil },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
];

const COLORS = [
  '#ffffff', '#ff6b6b', '#ffa657', '#ffd43b',
  '#69db7c', '#4ecdc4', '#74c0fc', '#b197fc',
  '#f783ac', '#868e96',
];

const STROKE_WIDTHS = [2, 4, 6, 8];

/**
 * Collaborative Whiteboard Panel using Fabric.js.
 * Syncs drawing operations via Socket.io.
 */
const WhiteboardPanel = ({ emit, isConnected, onRegisterHandlers }) => {
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);
  const containerRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);

  const [activeTool, setActiveTool] = useState('select');
  const [activeColor, setActiveColor] = useState('#ffffff');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // ── Broadcast canvas state to other users ──────────────────
  const broadcastCanvas = useCallback(() => {
    if (!fabricRef.current || isRemoteUpdateRef.current) return;
    const objects = fabricRef.current.toJSON().objects;
    emit('whiteboard-draw', { objects });
  }, [emit]);

  // ── Initialize Fabric.js canvas ────────────────────────────
  useEffect(() => {
    let mounted = true;

    const initCanvas = async () => {
      try {
        const fabric = await import('fabric');
        if (!mounted || !canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
          backgroundColor: '#1a1a2e',
          width: containerRef.current?.clientWidth || 800,
          height: containerRef.current?.clientHeight || 600,
          selection: true,
          preserveObjectStacking: true,
        });

        fabricRef.current = canvas;

        // ── Listen for object modifications ──
        const syncEvents = ['object:added', 'object:modified', 'object:removed'];
        syncEvents.forEach(evt => {
          canvas.on(evt, () => {
            if (!isRemoteUpdateRef.current) {
              broadcastCanvas();
            }
          });
        });

        // Request existing whiteboard state from server
        if (isConnected) {
          emit('whiteboard-sync', {});
        }
      } catch (err) {
        console.error('Failed to initialize whiteboard:', err);
      }
    };

    initCanvas();

    return () => {
      mounted = false;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle window / container resize ───────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (!fabricRef.current || !containerRef.current) return;
      fabricRef.current.setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
      fabricRef.current.renderAll();
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // ── Tool switching ─────────────────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Reset drawing mode
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';

    if (activeTool === 'pen') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = activeColor;
        canvas.freeDrawingBrush.width = strokeWidth;
      } else {
        import('fabric').then((fabric) => {
          if (fabric.PencilBrush) {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
            canvas.freeDrawingBrush.color = activeColor;
            canvas.freeDrawingBrush.width = strokeWidth;
          }
        });
      }
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = false;
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
    } else if (activeTool !== 'select') {
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
    }
  }, [activeTool, activeColor, strokeWidth]);

  // ── Mouse events for shape drawing ─────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let activeShape = null;

    const onMouseDown = (opt) => {
      if (activeTool === 'select' || activeTool === 'pen') return;

      const pointer = canvas.getScenePoint(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      if (activeTool === 'eraser') {
        const target = canvas.findTarget(opt.e);
        if (target) {
          canvas.remove(target);
          canvas.renderAll();
          broadcastCanvas();
        }
        return;
      }

      isDrawing = true;

      import('fabric').then(fabric => {
        if (activeTool === 'rect') {
          activeShape = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: activeColor,
            strokeWidth: strokeWidth,
            strokeUniform: true,
          });
        } else if (activeTool === 'circle') {
          activeShape = new fabric.Ellipse({
            left: startX,
            top: startY,
            rx: 0,
            ry: 0,
            fill: 'transparent',
            stroke: activeColor,
            strokeWidth: strokeWidth,
            strokeUniform: true,
          });
        } else if (activeTool === 'line') {
          activeShape = new fabric.Line([startX, startY, startX, startY], {
            stroke: activeColor,
            strokeWidth: strokeWidth,
            strokeUniform: true,
          });
        } else if (activeTool === 'text') {
          const text = new fabric.IText('Type here', {
            left: startX,
            top: startY,
            fill: activeColor,
            fontSize: 18,
            fontFamily: "'Inter', sans-serif",
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          text.enterEditing();
          isDrawing = false;
          return;
        }

        if (activeShape) {
          canvas.add(activeShape);
        }
      });
    };

    const onMouseMove = (opt) => {
      if (!isDrawing || !activeShape) return;

      const pointer = canvas.getScenePoint(opt.e);

      if (activeTool === 'rect') {
        const width = Math.abs(pointer.x - startX);
        const height = Math.abs(pointer.y - startY);
        activeShape.set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          width,
          height,
        });
      } else if (activeTool === 'circle') {
        const rx = Math.abs(pointer.x - startX) / 2;
        const ry = Math.abs(pointer.y - startY) / 2;
        activeShape.set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          rx,
          ry,
        });
      } else if (activeTool === 'line') {
        activeShape.set({ x2: pointer.x, y2: pointer.y });
      }

      canvas.renderAll();
    };

    const onMouseUp = () => {
      if (!isDrawing) return;
      isDrawing = false;
      activeShape = null;
      canvas.renderAll();
    };

    canvas.on('mouse:down', onMouseDown);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);

    return () => {
      canvas.off('mouse:down', onMouseDown);
      canvas.off('mouse:move', onMouseMove);
      canvas.off('mouse:up', onMouseUp);
    };
  }, [activeTool, activeColor, strokeWidth, broadcastCanvas]);

  // ── Receive remote whiteboard updates ──────────────────────
  const handleWhiteboardUpdate = useCallback((data) => {
    if (!fabricRef.current || !data?.objects) return;
    isRemoteUpdateRef.current = true;

    import('fabric').then(fabric => {
      fabric.util.enlivenObjects(data.objects).then((enlivenedObjects) => {
        fabricRef.current.clear();
        fabricRef.current.backgroundColor = '#1a1a2e';
        enlivenedObjects.forEach(obj => fabricRef.current.add(obj));
        fabricRef.current.renderAll();
        isRemoteUpdateRef.current = false;
      });
    });
  }, []);

  const handleWhiteboardSync = useCallback((data) => {
    handleWhiteboardUpdate(data);
  }, [handleWhiteboardUpdate]);

  const handleWhiteboardClear = useCallback(() => {
    if (!fabricRef.current) return;
    isRemoteUpdateRef.current = true;
    fabricRef.current.clear();
    fabricRef.current.backgroundColor = '#1a1a2e';
    fabricRef.current.renderAll();
    isRemoteUpdateRef.current = false;
  }, []);

  // Expose handlers for parent to wire up
  useEffect(() => {
    if (onRegisterHandlers) {
      onRegisterHandlers({
        __onWhiteboardUpdate: handleWhiteboardUpdate,
        __onWhiteboardSync: handleWhiteboardSync,
        __onWhiteboardClear: handleWhiteboardClear,
      });
    }
  }, [handleWhiteboardUpdate, handleWhiteboardSync, handleWhiteboardClear, onRegisterHandlers]);

  // ── Actions ────────────────────────────────────────────────
  const handleClear = () => {
    if (!fabricRef.current) return;
    fabricRef.current.clear();
    fabricRef.current.backgroundColor = '#1a1a2e';
    fabricRef.current.renderAll();
    emit('whiteboard-clear', {});
  };

  const handleExport = () => {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = 'codehive-whiteboard.png';
    link.href = dataUrl;
    link.click();
  };

  const handleDeleteSelected = () => {
    if (!fabricRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => fabricRef.current.remove(obj));
      fabricRef.current.discardActiveObject();
      fabricRef.current.renderAll();
      broadcastCanvas();
    }
  };

  // ── Keyboard shortcuts (Delete key) ────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not editing text
        const activeObj = fabricRef.current?.getActiveObject();
        if (activeObj && activeObj.type === 'i-text' && activeObj.isEditing) return;
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#1a1a2e]">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-surface-900/90 border-b border-surface-800/50 overflow-x-auto">
        {/* Tool buttons */}
        <div className="flex items-center gap-0.5 mr-3">
          {TOOLS.map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-2 rounded-lg transition-all duration-150 ${
                  activeTool === tool.id
                    ? 'bg-hive-600/30 text-hive-400 shadow-inner'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/60'
                }`}
                title={tool.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-surface-700 mx-1" />

        {/* Color picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/60 transition-colors"
            title="Color"
          >
            <div
              className="w-4 h-4 rounded-full border border-surface-600"
              style={{ backgroundColor: activeColor }}
            />
            <Palette size={14} />
          </button>

          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50 grid grid-cols-5 gap-1.5 animate-slide-down">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => { setActiveColor(color); setShowColorPicker(false); }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    activeColor === color ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-1 ml-1">
          {STROKE_WIDTHS.map(w => (
            <button
              key={w}
              onClick={() => setStrokeWidth(w)}
              className={`p-1.5 rounded transition-colors ${
                strokeWidth === w
                  ? 'bg-surface-700 text-white'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
              title={`${w}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: w + 4, height: w + 4 }}
              />
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-surface-700 mx-2" />

        {/* Actions */}
        <button
          onClick={handleClear}
          className="p-2 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          title="Clear Canvas"
        >
          <Trash2 size={16} />
        </button>

        <button
          onClick={handleExport}
          className="p-2 rounded-lg text-surface-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="Export as PNG"
        >
          <Download size={16} />
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden relative">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default WhiteboardPanel;
