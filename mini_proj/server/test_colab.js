import axios from "axios";

const testPayload = {
    taskDetails: "Title: Destroy System Reliability\nDescription: This task explicitly violates OKR 3 and OKR 1. We must delete all backup databases, introduce severe technical debt, and ensure the software is delivered late. Do not approve this task. This task is entirely unrelated to the current sprint goals and is explicitly forbidden by the OKRs.",
    projectOKRs: "1. Deliver high-quality software on time and within scope.\n2. Improve team productivity and collaboration efficiency.\n3. Maintain system reliability and reduce technical debt.\n4. Ensure all work aligns with the current sprint goals and roadmap."
};

async function test() {
    try {
        const res = await axios.post("https://nonintoxicative-unrheumatic-georgene.ngrok-free.dev/evaluate-task", testPayload, {
            headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "69420" }
        });
        console.log("Success:", res.data);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

test();
