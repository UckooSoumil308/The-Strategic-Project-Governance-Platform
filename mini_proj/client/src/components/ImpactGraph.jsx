import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const ImpactGraph = ({ nodes, edges, criticalPath, highlightIds = [] }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    useEffect(() => {
        if (!nodes || !nodes.length) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = Math.max(450, container.clientHeight);

        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3
            .select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);

        // Defs
        const defs = svg.append("defs");

        defs.append("marker")
            .attr("id", "arrow-normal")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 22)
            .attr("refY", 0)
            .attr("markerWidth", 7)
            .attr("markerHeight", 7)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#cbd5e1");

        defs.append("marker")
            .attr("id", "arrow-critical")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 22)
            .attr("refY", 0)
            .attr("markerWidth", 7)
            .attr("markerHeight", 7)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#ef4444");

        defs.append("marker")
            .attr("id", "arrow-highlight")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 22)
            .attr("refY", 0)
            .attr("markerWidth", 7)
            .attr("markerHeight", 7)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#f97316");

        // Sets
        const criticalSet = new Set(criticalPath || []);
        const highlightSet = new Set(highlightIds || []);
        const hasHighlight = highlightSet.size > 0;

        const criticalEdgeSet = new Set();
        for (let i = 0; i < criticalPath.length - 1; i++) {
            criticalEdgeSet.add(`${criticalPath[i]}->${criticalPath[i + 1]}`);
        }

        // Scales
        const maxImpact = Math.max(...nodes.map((n) => n.impactScore), 1);
        const nodeRadius = d3.scaleLinear().domain([0, maxImpact]).range([18, 36]);

        // Sim data
        const simNodes = nodes.map((n) => ({ ...n }));
        const simLinks = edges.map((e) => ({
            source: e.source,
            target: e.target,
            isCritical: criticalEdgeSet.has(`${e.source}->${e.target}`),
        }));

        // Simulation
        const simulation = d3
            .forceSimulation(simNodes)
            .force(
                "link",
                d3.forceLink(simLinks).id((d) => d.id).distance(140)
            )
            .force("charge", d3.forceManyBody().strength(-350))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius((d) => nodeRadius(d.impactScore) + 8));

        const g = svg.append("g");

        svg.call(
            d3.zoom().scaleExtent([0.3, 3]).on("zoom", (event) => {
                g.attr("transform", event.transform);
            })
        );

        // Edges
        const link = g
            .append("g")
            .selectAll("line")
            .data(simLinks)
            .join("line")
            .attr("stroke", (d) => {
                if (hasHighlight) {
                    const srcId = typeof d.source === "object" ? d.source.id : d.source;
                    const tgtId = typeof d.target === "object" ? d.target.id : d.target;
                    if (highlightSet.has(srcId) && highlightSet.has(tgtId)) return "#f97316";
                }
                if (d.isCritical) return "#ef4444";
                return "#e2e8f0";
            })
            .attr("stroke-width", (d) => {
                if (hasHighlight) {
                    const srcId = typeof d.source === "object" ? d.source.id : d.source;
                    const tgtId = typeof d.target === "object" ? d.target.id : d.target;
                    if (highlightSet.has(srcId) && highlightSet.has(tgtId)) return 3;
                }
                return d.isCritical ? 2.5 : 1.5;
            })
            .attr("stroke-dasharray", (d) => (d.isCritical ? "none" : "5,3"))
            .attr("stroke-opacity", (d) => {
                if (!hasHighlight) return 1;
                const srcId = typeof d.source === "object" ? d.source.id : d.source;
                const tgtId = typeof d.target === "object" ? d.target.id : d.target;
                return (highlightSet.has(srcId) && highlightSet.has(tgtId)) ? 1 : 0.25;
            })
            .attr("marker-end", (d) => {
                if (hasHighlight) {
                    const srcId = typeof d.source === "object" ? d.source.id : d.source;
                    const tgtId = typeof d.target === "object" ? d.target.id : d.target;
                    if (highlightSet.has(srcId) && highlightSet.has(tgtId)) return "url(#arrow-highlight)";
                }
                return d.isCritical ? "url(#arrow-critical)" : "url(#arrow-normal)";
            });

        // Node groups
        const node = g
            .append("g")
            .selectAll("g")
            .data(simNodes)
            .join("g")
            .call(
                d3.drag()
                    .on("start", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on("drag", (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on("end", (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    })
            );

        // Circle
        node.append("circle")
            .attr("r", (d) => nodeRadius(d.impactScore))
            .attr("fill", (d) => {
                if (hasHighlight && highlightSet.has(d.id)) return "#fff7ed";
                if (hasHighlight) return "#f8fafc";
                return d.isCritical ? "#fef2f2" : "#f0f9ff";
            })
            .attr("stroke", (d) => {
                if (hasHighlight && highlightSet.has(d.id)) return "#f97316";
                if (hasHighlight) return "#e2e8f0";
                return d.isCritical ? "#ef4444" : "#93c5fd";
            })
            .attr("stroke-width", (d) => {
                if (hasHighlight && highlightSet.has(d.id)) return 3;
                return d.isCritical ? 2.5 : 1.5;
            })
            .attr("opacity", (d) => {
                if (!hasHighlight) return 1;
                return highlightSet.has(d.id) ? 1 : 0.35;
            })
            .style("cursor", "pointer");

        // Label
        node.append("text")
            .text((d) => (d.title.length > 12 ? d.title.slice(0, 11) + "…" : d.title))
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("fill", (d) => {
                if (hasHighlight && highlightSet.has(d.id)) return "#ea580c";
                if (hasHighlight) return "#94a3b8";
                return d.isCritical ? "#dc2626" : "#1e40af";
            })
            .attr("font-size", "10px")
            .attr("font-weight", "600")
            .attr("opacity", (d) => {
                if (!hasHighlight) return 1;
                return highlightSet.has(d.id) ? 1 : 0.35;
            })
            .style("pointer-events", "none");

        // Tooltip events
        node.on("mouseenter", (event, d) => {
            setTooltip({ x: event.pageX, y: event.pageY, data: d });
        })
            .on("mousemove", (event) => {
                setTooltip((prev) => (prev ? { ...prev, x: event.pageX, y: event.pageY } : null));
            })
            .on("mouseleave", () => {
                setTooltip(null);
            });

        // Tick
        simulation.on("tick", () => {
            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);
            node.attr("transform", (d) => `translate(${d.x},${d.y})`);
        });

        return () => simulation.stop();
    }, [nodes, edges, criticalPath, highlightIds]);

    return (
        <div ref={containerRef} className="relative w-full" style={{ height: "450px" }}>
            <svg ref={svgRef} className="w-full h-full rounded-3xl border border-gray-100 shadow-[inset_0_2px_20px_rgb(0,0,0,0.02)]" style={{ background: "#f8fafc" }} />

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="fixed bg-white/95 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.12)] rounded-2xl border border-white/60 text-xs z-50 transition-all duration-200"
                    style={{
                        left: tooltip.x + 12,
                        top: tooltip.y - 10,
                        padding: "16px 20px",
                        pointerEvents: "none",
                        minWidth: "220px",
                        lineHeight: "1.8",
                    }}
                >
                    <div className={`font-bold text-[15px] mb-3 pb-2 border-b border-gray-100/50 ${tooltip.data.isCritical ? "text-rose-600" : "text-indigo-600"}`}>
                        {tooltip.data.title}
                    </div>
                    <div className="grid gap-x-3" style={{ gridTemplateColumns: "auto 1fr" }}>
                        <span className="text-gray-400">ES / EF:</span>
                        <span className="text-gray-700">{tooltip.data.es} / {tooltip.data.ef}</span>
                        <span className="text-gray-400">LS / LF:</span>
                        <span className="text-gray-700">{tooltip.data.ls} / {tooltip.data.lf}</span>
                        <span className="text-gray-400">Float:</span>
                        <span className={tooltip.data.float === 0 ? "text-red-500 font-semibold" : "text-green-600"}>{tooltip.data.float} days</span>
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-gray-700">{tooltip.data.duration} days</span>
                        <span className="text-gray-400">Cost/Day:</span>
                        <span className="text-gray-700">${tooltip.data.costPerDay}</span>
                        <span className="text-gray-400">Impact:</span>
                        <span className="text-amber-600 font-bold">${tooltip.data.impactScore}</span>
                    </div>
                    {tooltip.data.isCritical && (
                        <div className="mt-2 bg-red-50 text-red-600 text-center text-[11px] font-semibold py-1 px-2 rounded-md border border-red-200">
                            ⚠ CRITICAL PATH
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-lg rounded-2xl border border-white p-4 text-[11px] text-gray-600 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                <div className="font-bold uppercase tracking-wider text-gray-800 text-xs mb-3">Legend</div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full border-2 border-red-400 bg-red-50 inline-block" />
                    Critical Path
                </div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full border-2 border-blue-300 bg-blue-50 inline-block" />
                    Normal Task
                </div>
                {highlightIds.length > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-3 h-3 rounded-full border-2 border-orange-400 bg-orange-50 inline-block" />
                        Affected (Simulation)
                    </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 border-t-2 border-red-400 inline-block" />
                    Critical Edge
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-5 border-t border-dashed border-gray-300 inline-block" />
                    Dependency
                </div>
            </div>
        </div>
    );
};

export default ImpactGraph;
