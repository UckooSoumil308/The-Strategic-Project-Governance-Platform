import Task from "../models/tasks.js";

/**
 * Adds business days to a given start date, skipping weekends (Saturday & Sunday).
 * @param {Date} startDate - The date to start counting from.
 * @param {number} daysToAdd - The number of business days to add.
 * @returns {Date} The new date.
 */
export const addBusinessDays = (startDate, daysToAdd) => {
    const date = new Date(startDate);
    
    // If duration is 1 day, it finishes on the same day (plus 0 extra days). 
    // Subtract 1 from daysToAdd to calculate the end date properly for a Gantt chart.
    let remainingDays = Math.max(0, daysToAdd - 1);

    // Initial check: if start date falls on a weekend, push to Monday
    if (date.getDay() === 0) date.setDate(date.getDate() + 1); // Sunday -> Monday
    if (date.getDay() === 6) date.setDate(date.getDate() + 2); // Saturday -> Monday

    while (remainingDays > 0) {
        date.setDate(date.getDate() + 1);
        const day = date.getDay();
        // 0 = Sunday, 6 = Saturday
        if (day !== 0 && day !== 6) {
            remainingDays--;
        }
    }
    return date;
};

/**
 * Recursively updates the start and end dates of all downstream dependent tasks 
 * whenever a predecessor's timeline shifts.
 * 
 * @param {String} taskId - The ID of the task that just shifted.
 * @param {Set} visited - A Set to track visited nodes to prevent circular dependency infinite loops.
 */
export const cascadeTaskDates = async (taskId, visited = new Set()) => {
    // Edge Case A: Circular Dependency Protection
    if (visited.has(taskId.toString())) return;
    visited.add(taskId.toString());

    try {
        // Find all immediate successors of this task
        const successors = await Task.find({ predecessors: taskId });

        for (const successor of successors) {
            // Edge Case C: The Bottleneck Race
            // A successor cannot start until ALL of its predecessors have finished.
            // We must find the MAXIMUM end date among all of its predecessors.
            
            const allPredecessors = await Task.find({ _id: { $in: successor.predecessors } });
            
            let maxEndDate = new Date(0); // Epoch start

            for (const pred of allPredecessors) {
                // Use explicit endDate if available, else calculate it
                const predEnd = pred.endDate ? new Date(pred.endDate) : addBusinessDays(pred.startDate || pred.date || new Date(), pred.duration || 1);
                
                if (predEnd > maxEndDate) {
                    maxEndDate = predEnd;
                }
            }

            // Ensure the maxEndDate isn't still epoch
            if (maxEndDate.getTime() === 0) {
                maxEndDate = new Date();
            }

            // The successor's new start date is the day AFTER the latest predecessor finishes
            let newStartDate = new Date(maxEndDate);
            newStartDate.setDate(newStartDate.getDate() + 1);

            // Adjust for Lead/Lag time if they exist
            const offsetMs = ((successor.lagTime || 0) * 86400000) - ((successor.leadTime || 0) * 86400000);
            newStartDate = new Date(newStartDate.getTime() + offsetMs);

            // Ensure start date doesn't land on a weekend
            if (newStartDate.getDay() === 0) newStartDate.setDate(newStartDate.getDate() + 1); // Sunday -> Monday
            if (newStartDate.getDay() === 6) newStartDate.setDate(newStartDate.getDate() + 2); // Saturday -> Monday

            // Edge Case B: Weekend / Non-Working Hours Math for duration
            const duration = successor.duration > 0 ? successor.duration : 1;
            const newEndDate = addBusinessDays(newStartDate, duration);

            // Only update and recurse if the dates actually changed to save DB calls
            const currentStart = successor.startDate ? new Date(successor.startDate).getTime() : new Date(successor.date).getTime();
            const currentEnd = successor.endDate ? new Date(successor.endDate).getTime() : 0;

            if (newStartDate.getTime() !== currentStart || newEndDate.getTime() !== currentEnd) {
                successor.startDate = newStartDate;
                successor.date = newStartDate; // Legacy compatibility
                successor.endDate = newEndDate;
                
                await successor.save();

                // Recursively cascade downstream
                await cascadeTaskDates(successor._id, visited);
            }
        }
    } catch (error) {
        console.error(`[ScheduleEngine] Failed to cascade dates for task ${taskId}:`, error);
    }
};
