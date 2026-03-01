import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { format, addDays, startOfDay } from "date-fns";
import { useUpdateTaskScheduleMutation } from "../redux/slices/api/taskApiSlice";

const GanttTimeline = ({ tasks }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    // RTK Query Mutation for dragging bars
    const [updateSchedule] = useUpdateTaskScheduleMutation();

    useEffect(() => {
        if (!tasks || !tasks.length) return;

        const container = containerRef.current;
        const width = container.clientWidth || 1000;
        const barHeight = 40;
        const height = Math.max(500, tasks.length * (barHeight + 20) + 120);

        d3.select(svgRef.current).selectAll("*").remove();

        const svg = d3
            .select(svgRef.current)
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);

        // ── 0. Defs (Shadows & Arrows) ─────────────────────────
        const defs = svg.append("defs");

        // Premium Drop Shadow
        const filter = defs.append("filter")
            .attr("id", "drop-shadow")
            .attr("x", "-20%")
            .attr("y", "-20%")
            .attr("width", "140%")
            .attr("height", "140%");

        filter.append("feDropShadow")
            .attr("dx", "0")
            .attr("dy", "3")
            .attr("stdDeviation", "4")
            .attr("flood-opacity", "0.2")
            .attr("flood-color", "#000000");

        // Curved Arrow Head for dependencies
        defs.append("marker")
            .attr("id", "arrow-dep")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 8)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#64748b"); // Slate 500

        // ── 1. Data Prep ───────────────────────────────────────
        let validTasks = tasks.map(t => {
            const startDate = t.date ? startOfDay(new Date(t.date)) : startOfDay(new Date());
            const duration = t.duration || 1;
            const endDate = addDays(startDate, duration);
            return {
                ...t,
                startDate,
                endDate,
                duration
            };
        }).sort((a, b) => a.startDate - b.startDate);

        const minDate = d3.min(validTasks, d => d.startDate);
        const maxDate = addDays(d3.max(validTasks, d => d.endDate), 7);
        const plotMinDate = addDays(minDate, -3);

        // ── 2. Scales & Layout ─────────────────────────────────
        const margin = { top: 80, right: 30, bottom: 20, left: 220 }; // Extra top margin for double axis
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const xScale = d3.scaleTime()
            .domain([plotMinDate, maxDate])
            .range([0, innerWidth]);

        const yScale = d3.scaleBand()
            .domain(validTasks.map(d => d._id))
            .range([0, innerHeight])
            .padding(0.35);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // ── 3. Premium Axes (Months & Days) ────────────────────
        // Month Header background (inserts before 'g' to render behind text)
        svg.insert("rect", "g")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", margin.top)
            .attr("fill", "#f8fafc"); // slate 50

        // Month border bottom line
        svg.insert("line", "g")
            .attr("x1", 0)
            .attr("y1", margin.top)
            .attr("x2", width)
            .attr("y2", margin.top)
            .attr("stroke", "#e2e8f0");

        // Month Axis
        const xMonthAxis = d3.axisTop(xScale)
            .ticks(d3.timeMonth.every(1))
            .tickFormat(d3.timeFormat("%B %Y"))
            .tickSize(0)
            .tickPadding(10);

        g.append("g")
            .attr("class", "x-axis-month text-slate-800 font-bold text-sm")
            .attr("transform", "translate(0, -40)") // Move month up
            .call(xMonthAxis)
            .call(g => g.select(".domain").remove()); // hide domain line

        // Day Axis
        const xDayAxis = d3.axisTop(xScale)
            .ticks(d3.timeDay.every(1))
            .tickFormat(d3.timeFormat("%d"))
            .tickSize(6)
            .tickPadding(6);

        g.append("g")
            .attr("class", "x-axis-day text-slate-500 font-medium text-xs")
            .call(xDayAxis)
            .call(g => g.select(".domain").attr("stroke", "#cbd5e1")); // Soft boundary

        // Vertical Gridlines (alternating weekends for premium feel)
        const ticks = xScale.ticks(d3.timeDay.every(1));
        g.append("g")
            .attr("class", "grid-lines")
            .selectAll("rect.weekend")
            .data(ticks)
            .join("rect")
            .attr("x", d => xScale(d))
            .attr("y", 0)
            .attr("width", d => {
                const day = d.getDay();
                if (day === 6) return xScale(addDays(d, 2)) - xScale(d); // highlight weekend span
                return 0;
            })
            .attr("height", innerHeight)
            .attr("fill", "#f1f5f9") // slate 100
            .attr("opacity", d => (d.getDay() === 6) ? 0.6 : 0);

        g.append("g")
            .attr("class", "grid-lines")
            .selectAll("line")
            .data(ticks)
            .join("line")
            .attr("x1", d => xScale(d))
            .attr("x2", d => xScale(d))
            .attr("y1", 0)
            .attr("y2", innerHeight)
            .attr("stroke", "#e2e8f0")
            .attr("stroke-dasharray", "4,4")
            .attr("opacity", 0.5);

        // ── 4. Curved Dependency Lines ─────────────────────────
        const pathsG = g.append("g").attr("class", "dependency-lines");

        const links = [];
        validTasks.forEach(task => {
            if (task.successors && task.successors.length > 0) {
                task.successors.forEach(succId => {
                    const target = validTasks.find(t => t._id === succId);
                    if (target) {
                        links.push({ source: task, target: target });
                    }
                });
            }
        });

        // Function to draw curved step lines
        const drawDependencyPath = (d) => {
            const startX = xScale(d.source.endDate);
            const startY = yScale(d.source._id) + yScale.bandwidth() / 2;
            const endX = xScale(d.target.startDate) - 4; // leave room for arrow
            const endY = yScale(d.target._id) + yScale.bandwidth() / 2;

            const radius = 8; // Border radius for corners
            const path = d3.path();

            path.moveTo(startX, startY);

            // If the successor is ahead in time (normal flow)
            if (endX > startX + 20) {
                const midX = startX + 15;
                path.lineTo(midX - radius, startY);
                // arcTo(x1, y1, x2, y2, radius)
                if (endY > startY) { // Target is below
                    path.arcTo(midX, startY, midX, startY + radius, radius);
                    path.lineTo(midX, endY - radius);
                    path.arcTo(midX, endY, midX + radius, endY, radius);
                } else { // Target is above
                    path.arcTo(midX, startY, midX, startY - radius, radius);
                    path.lineTo(midX, endY + radius);
                    path.arcTo(midX, endY, midX + radius, endY, radius);
                }
                path.lineTo(endX, endY);
            } else {
                // If successor overlaps or is behind (backwards flow)
                const downOffset = (yScale.step() * 0.4);
                if (endY > startY) {
                    path.lineTo(startX + 10 - radius, startY);
                    path.arcTo(startX + 10, startY, startX + 10, startY + radius, radius);
                    path.lineTo(startX + 10, startY + downOffset - radius);
                    path.arcTo(startX + 10, startY + downOffset, startX + 10 - radius, startY + downOffset, radius);
                    path.lineTo(endX - 10 + radius, startY + downOffset);
                    path.arcTo(endX - 10, startY + downOffset, endX - 10, startY + downOffset + radius, radius);
                    path.lineTo(endX - 10, endY - radius);
                    path.arcTo(endX - 10, endY, endX - 10 + radius, endY, radius);
                    path.lineTo(endX, endY);
                } else {
                    // Logic for backwards upwards (simplified as bezier for edge cases)
                    return `M ${startX} ${startY} C ${startX + 30} ${startY}, ${endX - 30} ${endY}, ${endX} ${endY}`;
                }
            }
            return path.toString();
        };

        pathsG.selectAll("path")
            .data(links)
            .join("path")
            .attr("d", drawDependencyPath)
            .attr("fill", "none")
            .attr("stroke", "#94a3b8")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrow-dep)")
            .attr("class", "transition-all duration-300")
            .on("mouseenter", function () {
                d3.select(this).attr("stroke", "#3b82f6").attr("stroke-width", 3);
            })
            .on("mouseleave", function () {
                d3.select(this).attr("stroke", "#94a3b8").attr("stroke-width", 2);
            });

        // ── 5. Y-Axis Labels (Left Sidebar) ────────────────────
        const textsG = g.append("g").attr("class", "y-labels");

        validTasks.forEach(task => {
            const yPos = yScale(task._id) + yScale.bandwidth() / 2;

            // Task Title
            textsG.append("text")
                .attr("class", "task-label font-bold fill-slate-800 text-sm")
                .attr("x", -15)
                .attr("y", yPos - 4)
                .attr("text-anchor", "end")
                .text(task.title.length > 22 ? task.title.slice(0, 21) + '…' : task.title)
                .style("cursor", "pointer")
                .append("title")
                .text(task.title);

            // Subtitle / Subtext (e.g. priority or duration)
            textsG.append("text")
                .attr("class", "task-sublabel fill-slate-400 text-xs")
                .attr("x", -15)
                .attr("y", yPos + 12)
                .attr("text-anchor", "end")
                .text(`${task.duration}d • ${task.priority}`);
        });

        // ── 6. Rendering Task Bars (Premium Look & Drag) ───────
        const getTaskColor = (stage, priority) => {
            if (stage === "completed") return "url(#grad-completed)";
            if (stage === "in progress") return "url(#grad-inprogress)";
            // Default todo
            if (priority === "high") return "url(#grad-high)";
            return "url(#grad-todo)";
        };

        // Create Gradients
        const addGradient = (id, colorStart, colorEnd) => {
            const grad = defs.append("linearGradient")
                .attr("id", id)
                .attr("x1", "0%").attr("y1", "0%")
                .attr("x2", "100%").attr("y2", "100%");
            grad.append("stop").attr("offset", "0%").attr("stop-color", colorStart);
            grad.append("stop").attr("offset", "100%").attr("stop-color", colorEnd);
        };
        addGradient("grad-completed", "#10b981", "#059669"); // Emerald
        addGradient("grad-inprogress", "#3b82f6", "#2563eb"); // Blue
        addGradient("grad-high", "#f43f5e", "#e11d48"); // Rose
        addGradient("grad-todo", "#94a3b8", "#64748b"); // Slate

        const drag = d3.drag()
            .on("start", function (event, d) {
                d3.select(this)
                    .classed("dragging", true)
                    .attr("opacity", 0.9)
                    .attr("filter", "none"); // Removing shadow during drag improves FPS
            })
            .on("drag", function (event, d) {
                const currentX = parseFloat(d3.select(this).attr("x"));
                const dx = event.dx;
                let newX = currentX + dx;

                // Snap visually during drag (snapping to nearest day line)
                const dateAtCursor = xScale.invert(newX);
                const snappedDate = startOfDay(d3.timeDay.round(dateAtCursor));
                const snapX = xScale(snappedDate);

                // We physically move the bar freely but can add a "ghost" bar for snap target
                d3.select(this).attr("x", newX);
            })
            .on("end", async function (event, d) {
                d3.select(this)
                    .classed("dragging", false)
                    .attr("opacity", 1)
                    .attr("filter", "url(#drop-shadow)");

                // Calculate snapped Date from dropped location
                const finalX = parseFloat(d3.select(this).attr("x"));
                const droppedDate = xScale.invert(finalX);
                const snappedDate = startOfDay(d3.timeDay.round(droppedDate));

                // Snap visually back to grid
                d3.select(this)
                    .transition().duration(200)
                    .attr("x", xScale(snappedDate));

                // Commit to Redux Backend
                if (snappedDate.getTime() !== d.startDate.getTime()) {
                    try {
                        await updateSchedule({
                            _id: d._id,
                            date: snappedDate.toISOString()
                        }).unwrap();
                    } catch (error) {
                        console.error("Failed to update schedule", error);
                        // Revert visually on fail
                        d3.select(this)
                            .transition().duration(300)
                            .attr("x", xScale(d.startDate));
                    }
                }
            });

        const barsGroup = g.append("g").attr("class", "task-bars");

        const bars = barsGroup
            .selectAll("rect.task-bar")
            .data(validTasks)
            .join("rect")
            .attr("class", "task-bar hover:brightness-110 transition-all")
            .attr("x", d => xScale(d.startDate))
            .attr("y", d => yScale(d._id))
            .attr("width", d => Math.max(xScale(d.endDate) - xScale(d.startDate), 12))
            .attr("height", yScale.bandwidth())
            .attr("rx", 8) // Rounded corners!
            .attr("ry", 8)
            .attr("fill", d => getTaskColor(d.stage, d.priority))
            .attr("filter", "url(#drop-shadow)") // Drop shadow included!
            .style("cursor", "grab")
            .call(drag);

        // Subtext inside bars (e.g., assignee initials or completion state)
        barsGroup.selectAll("text.inside-bar")
            .data(validTasks)
            .join("text")
            .attr("class", "inside-bar text-white font-bold text-[10px] pointer-events-none")
            .attr("x", d => xScale(d.startDate) + 8)
            .attr("y", d => yScale(d._id) + yScale.bandwidth() / 2 + 3)
            .text(d => {
                const w = xScale(d.endDate) - xScale(d.startDate);
                if (w > 50 && d.stage === "completed") return "✓ DONE";
                return "";
            });

        // ── 7. Tooltips ────────────────────────────────────────
        bars.on("mouseenter", (event, d) => {
            setTooltip({
                x: event.pageX,
                y: event.pageY,
                data: d
            });
        }).on("mousemove", (event) => {
            setTooltip(prev => prev ? { ...prev, x: event.pageX, y: event.pageY } : null);
        }).on("mouseleave", () => {
            setTooltip(null);
        });

    }, [tasks, updateSchedule]);

    return (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-x-auto relative mt-4">
            <div ref={containerRef} className="min-w-[900px]">
                <svg ref={svgRef} className="w-full text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }} />
            </div>

            {/* Float Tooltip */}
            {tooltip && (
                <div
                    className="fixed bg-slate-900 border border-slate-700 text-white text-xs rounded-xl py-3 px-4 shadow-2xl z-[100] pointer-events-none backdrop-blur-md bg-opacity-90 transform -translate-x-1/2 -translate-y-full mb-3"
                    style={{ left: tooltip.x, top: tooltip.y - 10 }}
                >
                    <div className="font-bold mb-2 text-sm text-white">{tooltip.data.title}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                        <div className="text-slate-400 uppercase text-[9px] font-bold">Start</div>
                        <div className="text-slate-200">{format(new Date(tooltip.data.startDate), "MMM do, yyyy")}</div>

                        <div className="text-slate-400 uppercase text-[9px] font-bold">End</div>
                        <div className="text-slate-200">{format(new Date(tooltip.data.endDate), "MMM do, yyyy")}</div>

                        <div className="text-slate-400 uppercase text-[9px] font-bold">Duration</div>
                        <div className="text-slate-200">{tooltip.data.duration} days</div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between items-center">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                            {tooltip.data.stage}
                        </span>
                        <span className={`text-[10px] font-bold uppercase ${tooltip.data.priority === 'high' ? 'text-rose-400' : 'text-blue-400'}`}>
                            {tooltip.data.priority} Priority
                        </span>
                    </div>

                    {/* Tooltip triangle tail */}
                    <div className="absolute w-3 h-3 bg-slate-900 border-r border-b border-slate-700 transform rotate-45 left-1/2 -bottom-1.5 -ml-1.5"></div>
                </div>
            )}
        </div>
    );
};

export default GanttTimeline;
