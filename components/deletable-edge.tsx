"use client";

import { useCallback, useState } from "react";
import {
  EdgeProps,
  getSmoothStepPath,
  getBezierPath,
  getStraightPath,
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
} from "reactflow";
import { X, Workflow } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

type EdgeType = "smoothstep" | "bezier" | "straight" | "step";

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
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  
  // Get edge type from data or default to smoothstep
  const edgeType: EdgeType = (data?.edgeType as EdgeType) || "smoothstep";
  const borderRadius: number = (data?.borderRadius as number) || 12;

  // Calculate path based on edge type
  let edgePath: string;
  let labelX: number;
  let labelY: number;

  switch (edgeType) {
    case "bezier":
      [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });
      break;
    case "straight":
      [edgePath, labelX, labelY] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
      });
      break;
    case "step":
      [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 0, // Sharp corners for step
      });
      break;
    case "smoothstep":
    default:
      [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius,
      });
      break;
  }

  const onEdgeDelete = useCallback(() => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  }, [id, setEdges]);

  const changeEdgeType = useCallback((newType: EdgeType) => {
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, edgeType: newType } }
          : edge
      )
    );
  }, [id, setEdges]);

  const changeBorderRadius = useCallback((radius: number) => {
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id
          ? { ...edge, data: { ...edge.data, borderRadius: radius } }
          : edge
      )
    );
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
          <div className={`flex items-center gap-1 transition-all duration-200 ${
            isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
          }`}>
            {/* Edge Type Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 border-2 border-primary/30 dark:border-primary/50 shadow-md"
                  title="Change edge type"
                >
                  <Workflow className="h-3.5 w-3.5 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => changeEdgeType("smoothstep")}>
                  <span className={edgeType === "smoothstep" ? "font-bold" : ""}>
                    Smooth Step {edgeType === "smoothstep" && "✓"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeEdgeType("bezier")}>
                  <span className={edgeType === "bezier" ? "font-bold" : ""}>
                    Bezier {edgeType === "bezier" && "✓"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeEdgeType("straight")}>
                  <span className={edgeType === "straight" ? "font-bold" : ""}>
                    Straight {edgeType === "straight" && "✓"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeEdgeType("step")}>
                  <span className={edgeType === "step" ? "font-bold" : ""}>
                    Step {edgeType === "step" && "✓"}
                  </span>
                </DropdownMenuItem>
                {edgeType === "smoothstep" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => changeBorderRadius(0)}>
                      Sharp Corners
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeBorderRadius(8)}>
                      Small Radius
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeBorderRadius(12)}>
                      Medium Radius
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeBorderRadius(20)}>
                      Large Radius
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 border-2 border-red-300 dark:border-red-700 shadow-md"
              onClick={onEdgeDelete}
              title="Delete connection"
            >
              <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            </Button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
