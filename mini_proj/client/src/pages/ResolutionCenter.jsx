import React, { useState, useEffect } from "react";

import { toast } from "sonner";
import { MdOutlineWarning, MdOutlineAutoAwesome } from "react-icons/md";
import { FaRobot, FaCheckCircle, FaSpinner, FaLightbulb } from "react-icons/fa";
import { BiImages } from "react-icons/bi";
import UserList from "../components/task/UsersSelect";
import { supabase } from "../config/supabaseClient";

const ResolutionCenter = () => {
  const [quarantinedTasks, setQuarantinedTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // AI Strategy State
  const [selectedTask, setSelectedTask] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [rescuePlan, setRescuePlan] = useState(null);
  const [strategicReasoning, setStrategicReasoning] = useState("");
  const [healing, setHealing] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    fetchQuarantinedTasks();
  }, []);

  const fetchQuarantinedTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/task", {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (data?.tasks) {
        // Filter tasks that require resolution
        const flagged = data.tasks.filter((t) => t.stage === "requires_resolution");
        setQuarantinedTasks(flagged);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to fetch tasks.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeClick = async (task) => {
    setSelectedTask(task);
    setGeneratingPlan(true);
    setRescuePlan(null);
    setStrategicReasoning("");

    try {
      const res = await fetch(`/api/resolution/tasks/${task._id}/generate-rescue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (data.status && data.rescueTasks) {
        setStrategicReasoning(data.strategicReasoning || "");
        
        // Map data to include UI-specific editing state
        const editableTasks = data.rescueTasks.map(rt => ({
           ...rt,
           description: rt.instructions || "", // Pre-fill with AI instructions
           team: [],
           assets: [],
           pendingFiles: [] // Staging for Supabase upload
        }));
        setRescuePlan(editableTasks);
      } else {
        toast.error(data.message || "Failed to generate strategy.");
      }
    } catch (error) {
       toast.error(error?.message || "Analysis failed.");
    } finally {
       setGeneratingPlan(false);
    }
  };

  const uploadFileToSupabase = async (file) => {
    const fileName = `${new Date().getTime()}_${file.name}`;
    const { data, error } = await supabase.storage
        .from("project-assets")
        .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
        .from("project-assets")
        .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const syncRescuePlanUpdates = (index, field, value) => {
      setRescuePlan(prev => {
         const newPlan = [...prev];
         newPlan[index][field] = value;
         return newPlan;
      });
  };

  const handleApproveAndHeal = async () => {
    if (!selectedTask || !rescuePlan) return;
    setHealing(true);

    try {
      // 1. Upload any pending files to Supabase first
      const finalTasksData = [...rescuePlan];
      
      for (let i = 0; i < finalTasksData.length; i++) {
         const task = finalTasksData[i];
         if (task.pendingFiles && task.pendingFiles.length > 0) {
             setUploadingFiles(true);
             const uploadedUrls = [];
             for (const file of task.pendingFiles) {
                 const url = await uploadFileToSupabase(file);
                 uploadedUrls.push(url);
             }
             task.assets = uploadedUrls;
         }
      }
      setUploadingFiles(false);

      // 2. Dispatch the actual approval request
      const res = await fetch(`/api/resolution/tasks/${selectedTask._id}/approve-rescue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rescueTasksData: finalTasksData })
      });
      const data = await res.json();

      if (data.status) {
        toast.success("Schedule successfully healed!");
        
        // Remove from left column
        setQuarantinedTasks((prev) => prev.filter((t) => t._id !== selectedTask._id));
        
        // Reset right column
        setSelectedTask(null);
        setRescuePlan(null);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to heal schedule.");
    } finally {
      setHealing(false);
    }
  };

  return (
    <div className="flex h-full w-full gap-6 p-4">
      {/* LEFT COLUMN: Triage Queue */}
      <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center text-red-700">
              <MdOutlineWarning className="mr-2 text-2xl" /> Triage Queue
            </h2>
            <p className="text-sm text-red-500 mt-1">Timeline drift detected. Requires PM resolution.</p>
          </div>
          <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
            {quarantinedTasks.length} Failed
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <FaSpinner className="animate-spin text-2xl mr-2" /> Loading...
            </div>
          ) : quarantinedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FaCheckCircle className="text-5xl text-green-200 mb-2" />
              <p>No tasks require resolution. Your schedule is healthy.</p>
            </div>
          ) : (
            quarantinedTasks.map((task) => (
              <div 
                key={task._id} 
                className={`border rounded-lg p-4 transition-all ${selectedTask?._id === task._id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-red-200 bg-red-50/50 hover:bg-red-50'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-800 text-lg">{task.title}</h3>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200">Overdue</span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {task.description || "No description provided."}
                </p>

                <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                  <span>Failed Deadline: <strong className="text-red-600">{new Date(task.endDate || task.date).toLocaleDateString()}</strong></span>
                  <span>Assignees: {task.team?.length || 0}</span>
                </div>

                <div className="flex justify-end">
                  <button 
                    onClick={() => handleAnalyzeClick(task)}
                    className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors text-sm font-medium"
                  >
                    <FaRobot className="mr-2" /> Analyze Failure
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: AI Strategy */}
      <div className="w-1/2 flex flex-col bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-blue-50 p-4 border-b border-blue-100">
          <h2 className="text-xl font-bold flex items-center text-blue-800">
            <MdOutlineAutoAwesome className="mr-2 text-2xl text-blue-600" /> AI Resolution Strategy
          </h2>
          <p className="text-sm text-blue-600 mt-1">Autonomous graph swap & schedule healing.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
          {!selectedTask ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-8">
              <FaRobot className="text-6xl text-slate-200 mb-4" />
              <p className="text-lg font-medium text-slate-500">Awaiting Triage</p>
              <p className="text-sm mt-2">Select "Analyze Failure" from the queue to generate an autonomous rescue strategy.</p>
            </div>
          ) : generatingPlan ? (
            <div className="flex flex-col items-center justify-center h-full text-blue-500">
              <FaSpinner className="animate-spin text-4xl mb-4" />
              <p className="font-medium animate-pulse">Running Graph Analysis & LLM Generation...</p>
            </div>
          ) : rescuePlan ? (
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-2">Original Blocker</h3>
                <div className="bg-slate-200 p-3 rounded-md border border-slate-300">
                  <span className="line-through text-slate-600">{selectedTask.title}</span>
                </div>
              </div>

              {/* NEW: Semantic Strategic Reasoning Callout */}
              {strategicReasoning && (
                <div className="mb-8 bg-blue-50 border border-blue-200 rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                  <h3 className="text-sm uppercase tracking-wider text-blue-800 font-bold mb-3 flex items-center">
                    <FaLightbulb className="mr-2 text-yellow-500 text-lg" /> Executive Analysis
                  </h3>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line italic">
                    "{strategicReasoning}"
                  </p>
                </div>
              )}

              <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold mb-4">Proposed Rescue Sequence</h3>
              
              <div className="space-y-6 flex-1 pr-2">
                {rescuePlan.map((step, index) => (
                  <div key={index} className="flex gap-4 group relative" style={{ zIndex: rescuePlan.length - index }}>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 border-2 border-blue-500 flex items-center justify-center font-bold text-sm shadow-sm z-10 transition-transform group-hover:scale-110">
                        {index + 1}
                      </div>
                      {index < rescuePlan.length - 1 && (
                        <div className="w-0.5 h-full bg-blue-200 absolute mt-8 z-0"></div>
                      )}
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm flex-1 hover:shadow-md transition-shadow relative z-10">
                      
                      <input 
                         type="text"
                         value={step.title}
                         onChange={(e) => syncRescuePlanUpdates(index, "title", e.target.value)}
                         className="font-bold text-slate-800 text-lg w-full border-b border-transparent hover:border-blue-200 focus:border-blue-500 focus:outline-none transition-colors mb-2 bg-transparent"
                      />

                      <div className="grid grid-cols-2 gap-4 mt-4">
                         {/* Duration Edit */}
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Duration (Days)</label>
                            <input 
                               type="number"
                               min="1"
                               value={step.duration}
                               onChange={(e) => syncRescuePlanUpdates(index, "duration", parseInt(e.target.value) || 1)}
                               className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                         </div>

                         {/* Assets Edit */}
                         <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Attachments</label>
                            <label className="flex items-center justify-center gap-2 w-full bg-slate-50 border border-dashed border-slate-300 rounded px-3 py-2 text-sm text-slate-600 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
                               <BiImages className="text-lg text-blue-500" />
                               <span>{step.pendingFiles.length > 0 ? `${step.pendingFiles.length} File(s)` : 'Upload Assets'}</span>
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 multiple 
                                 onChange={(e) => syncRescuePlanUpdates(index, "pendingFiles", Array.from(e.target.files))} 
                               />
                            </label>
                         </div>
                      </div>

                      {/* Description Edit */}
                      <div className="mt-4">
                         <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Instructions</label>
                         <textarea 
                            rows="2"
                            placeholder="Add specifics or context for the assignee..."
                            value={step.description || ""}
                            onChange={(e) => syncRescuePlanUpdates(index, "description", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                         />
                      </div>

                      {/* Assignee Edit */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                         <UserList team={step.team} setTeam={(newTeam) => syncRescuePlanUpdates(index, "team", newTeam)} />
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={handleApproveAndHeal}
                  disabled={healing || uploadingFiles}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center justify-center disabled:opacity-70"
                >
                  {uploadingFiles ? (
                    <><FaSpinner className="animate-spin mr-2" /> Uploading Assets... </>
                  ) : healing ? (
                    <><FaSpinner className="animate-spin mr-2" /> Healing Gannt Chart... </>
                  ) : (
                    <><FaCheckCircle className="mr-2 text-lg" /> Approve & Heal Schedule</>
                  )}
                </button>
                <p className="text-xs text-center text-slate-500 mt-3">
                  Approving will archive the failed task, insert the rescue sequence, and recursively heal all downstream dependent task dates.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ResolutionCenter;
