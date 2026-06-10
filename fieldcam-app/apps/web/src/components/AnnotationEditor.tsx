"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  ArrowRight, Square, Circle, Type, Undo2, Redo2, Save, Palette, Trash2, MousePointer
} from "lucide-react";

type AnnotationElement =
  | { type: "arrow"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { type: "rectangle"; x: number; y: number; w: number; h: number; color: string; width: number }
  | { type: "circle"; cx: number; cy: number; rx: number; ry: number; color: string; width: number }
  | { type: "text"; x: number; y: number; text: string; color: string; fontSize: number };

type Tool = "select" | "arrow" | "rectangle" | "circle" | "text";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ffffff", "#000000"];

export default function AnnotationEditor({
  mediaId,
  imageUrl,
  onSave,
  onClose,
}: {
  mediaId: string;
  imageUrl: string;
  onSave?: () => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<AnnotationElement[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationElement[][]>([]);
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [saving, setSaving] = useState(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Render canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d")!;

    canvas.width = image.width;
    canvas.height = image.height;

    // Draw image
    ctx.drawImage(image, 0, 0);

    // Draw existing elements
    for (const el of elements) {
      drawElement(ctx, el);
    }

    // Draw current drawing preview
    if (isDrawing) {
      const preview = createPreviewElement();
      if (preview) drawElement(ctx, preview);
    }
  }, [image, elements, isDrawing, startPos, currentPos, tool, color, strokeWidth]);

  useEffect(() => { render(); }, [render]);

  function drawElement(ctx: CanvasRenderingContext2D, el: AnnotationElement) {
    ctx.save();
    switch (el.type) {
      case "arrow": {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
        const headLen = 15 + el.width * 2;
        ctx.beginPath();
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(el.x2 - headLen * Math.cos(angle - 0.4), el.y2 - headLen * Math.sin(angle - 0.4));
        ctx.moveTo(el.x2, el.y2);
        ctx.lineTo(el.x2 - headLen * Math.cos(angle + 0.4), el.y2 - headLen * Math.sin(angle + 0.4));
        ctx.stroke();
        break;
      }
      case "rectangle": {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.width;
        ctx.strokeRect(el.x, el.y, el.w, el.h);
        break;
      }
      case "circle": {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.width;
        ctx.beginPath();
        ctx.ellipse(el.cx, el.cy, Math.abs(el.rx), Math.abs(el.ry), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "text": {
        ctx.fillStyle = el.color;
        ctx.font = `bold ${el.fontSize}px Arial`;
        ctx.fillText(el.text, el.x, el.y);
        break;
      }
    }
    ctx.restore();
  }

  function createPreviewElement(): AnnotationElement | null {
    const dx = currentPos.x - startPos.x;
    const dy = currentPos.y - startPos.y;
    switch (tool) {
      case "arrow":
        return { type: "arrow", x1: startPos.x, y1: startPos.y, x2: currentPos.x, y2: currentPos.y, color, width: strokeWidth };
      case "rectangle":
        return { type: "rectangle", x: Math.min(startPos.x, currentPos.x), y: Math.min(startPos.y, currentPos.y), w: Math.abs(dx), h: Math.abs(dy), color, width: strokeWidth };
      case "circle":
        return { type: "circle", cx: (startPos.x + currentPos.x) / 2, cy: (startPos.y + currentPos.y) / 2, rx: Math.abs(dx) / 2, ry: Math.abs(dy) / 2, color, width: strokeWidth };
      default:
        return null;
    }
  }

  function getCanvasPos(e: React.MouseEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (tool === "text") {
      const pos = getCanvasPos(e);
      const text = prompt("Enter text:");
      if (text) {
        setUndoStack([...undoStack, [...elements]]);
        setElements([...elements, { type: "text", x: pos.x, y: pos.y, text, color, fontSize: 24 + strokeWidth * 4 }]);
      }
      return;
    }
    if (tool === "select") return;
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    setStartPos(pos);
    setCurrentPos(pos);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDrawing) return;
    setCurrentPos(getCanvasPos(e));
  }

  function handleMouseUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    const el = createPreviewElement();
    if (el) {
      setUndoStack([...undoStack, [...elements]]);
      setElements([...elements, el]);
    }
  }

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setElements(prev);
  }

  function clearAll() {
    setUndoStack([...undoStack, [...elements]]);
    setElements([]);
  }

  async function handleSave() {
    if (!image) return;
    setSaving(true);
    try {
      await api.post(`/media/${mediaId}/annotations`, {
        elements,
        canvas_width: image.width,
        canvas_height: image.height,
      });
      onSave?.();
      onClose();
    } catch {}
    setSaving(false);
  }

  const tools: { id: Tool; icon: typeof ArrowRight; label: string }[] = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "arrow", icon: ArrowRight, label: "Arrow" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
                className={`p-2 rounded-lg transition ${tool === t.id ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"}`}>
                <Icon className="w-4 h-4" />
              </button>
            );
          })}

          <div className="w-px h-6 bg-slate-200 mx-2" />

          {/* Colors */}
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition ${color === c ? "border-blue-500 scale-110" : "border-slate-300"}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          {/* Stroke width */}
          <select value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="px-2 py-1 text-xs border border-slate-200 rounded">
            <option value={2}>Thin</option>
            <option value={3}>Medium</option>
            <option value={5}>Thick</option>
          </select>

          <div className="w-px h-6 bg-slate-200 mx-2" />

          <button onClick={undo} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg" title="Undo">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={clearAll} className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onClose}
            className="px-3 py-1.5 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="max-w-full max-h-full cursor-crosshair shadow-lg"
          style={{ imageRendering: "auto" }}
        />
      </div>
    </div>
  );
}
