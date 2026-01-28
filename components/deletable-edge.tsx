"use client";

import { useCallback, useState } from "react";
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
} from "reactflow";
import { X } from "lucide-react";
import { Button } from "./ui/button";

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  animated,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeDelete = useCallback(() => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  }, [id, setEdges]);

  return (
    <>
      {/* Invisible wider path for better hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="cursor-pointer"
      />
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 border-2 border-red-300 dark:border-red-700 shadow-md transition-all duration-200 ${
              isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
            onClick={onEdgeDelete}
            title="Delete connection"
          >
            <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
          </Button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
