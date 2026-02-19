import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { MdGppBad, MdClose } from "react-icons/md";

/**
 * GovernanceModal — "🛑 Blocked: Strategic Drift Detected"
 *
 * Props:
 *   open     - boolean
 *   setOpen  - fn(bool)
 *   reason   - string (AI Judge's reason)
 *   taskTitle- string (the blocked task's title)
 */
const GovernanceModal = ({ open, setOpen, reason, taskTitle }) => {
    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-50"
                onClose={() => setOpen(false)}
            >
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div
                        className="fixed inset-0 transition-opacity"
                        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
                    />
                </Transition.Child>

                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                                {/* Red gradient header */}
                                <div
                                    className="px-6 py-5"
                                    style={{
                                        background:
                                            "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <MdGppBad className="text-white text-2xl" />
                                            </div>
                                            <div>
                                                <Dialog.Title className="text-lg font-bold text-white">
                                                    🛑 Blocked: Strategic Drift Detected
                                                </Dialog.Title>
                                                <p className="text-red-200 text-xs mt-0.5">
                                                    AI Governance Judge Decision
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setOpen(false)}
                                            className="text-white/70 hover:text-white transition-colors"
                                        >
                                            <MdClose className="text-xl" />
                                        </button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="px-6 py-5">
                                    {/* Task title */}
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                                            Proposed Task
                                        </p>
                                        <p className="text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                            {taskTitle || "Untitled Task"}
                                        </p>
                                    </div>

                                    {/* AI Reason */}
                                    <div className="mb-5">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                                            AI Judge Reasoning
                                        </p>
                                        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                                            <p className="text-sm text-red-800 leading-relaxed">
                                                {reason ||
                                                    "This task does not align with the project's strategic objectives."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 mb-5">
                                        <p className="text-xs text-amber-700 leading-relaxed">
                                            <strong>What happens next?</strong>{" "}
                                            The task has been saved with{" "}
                                            <span className="font-semibold">
                                                "Pending Governance Review"
                                            </span>{" "}
                                            status. An admin can approve or reject
                                            it from the task management panel.
                                        </p>
                                    </div>

                                    {/* Dismiss Button */}
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
                                    >
                                        Understood
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
};

export default GovernanceModal;
