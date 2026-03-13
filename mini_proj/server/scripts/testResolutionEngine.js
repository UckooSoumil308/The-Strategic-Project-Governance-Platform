import mongoose from "mongoose";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

// Adjust path to load server/.env correctly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import Task from "../models/tasks.js";
import User from "../models/users.js";

const BASE_URL = `http://localhost:${process.env.PORT || 8800}/api`;

async function runTests() {
    console.log("🚀 Starting AI Resolution Engine E2E Tests...\n");
    let testTasks = [];
    let testUser = null;

    try {
        console.log("📦 1. Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("   ✅ Connected to Mongoose");

        // Create a temporary admin user for extracting an auth token
        testUser = new User({
            name: "Test Admin",
            email: "testadmin@resolution.com",
            password: "password123",
            role: "Admin",
            title: "Manager",
            isAdmin: true,
            isActive: true,
            organizationId: new mongoose.Types.ObjectId() // Mock ORG id
        });
        await testUser.save();

        const token = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        const authConfig = {
            headers: {
                "Cookie": `token=${token}`
            }
        };

        console.log("\n🌱 2. Seeding Dummy Dependency Chain...");
        const now = new Date();
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - 3); // 3 days ago

        // Task A (Overdue)
        const taskA = new Task({
            title: "__TEST__ Task A (Overdue)",
            stage: "todo",
            date: pastDate,
            startDate: pastDate,
            endDate: pastDate,
            duration: 1,
            organizationId: testUser.organizationId
        });
        await taskA.save();

        // Task B (Depends on Task A)
        const taskB = new Task({
            title: "__TEST__ Task B",
            stage: "todo",
            date: now,
            startDate: now,
            endDate: new Date(now.getTime() + 86400000), // +1 day
            duration: 1,
            predecessors: [taskA._id],
            organizationId: testUser.organizationId
        });
        await taskB.save();
        
        taskA.successors.push(taskB._id);
        await taskA.save();

        // Task C (Depends on Task B)
        const taskC = new Task({
            title: "__TEST__ Task C",
            stage: "todo",
            date: new Date(now.getTime() + 86400000), // Tomorrow
            startDate: new Date(now.getTime() + 86400000),
            endDate: new Date(now.getTime() + 2 * 86400000), // +2 days
            duration: 1,
            predecessors: [taskB._id],
            organizationId: testUser.organizationId
        });
        await taskC.save();
        
        taskB.successors.push(taskC._id);
        await taskB.save();

        testTasks = [taskA._id, taskB._id, taskC._id];
        console.log(`   ✅ Seeded: A(${taskA._id}), B(${taskB._id}), C(${taskC._id})`);

        console.log("\n🕰️ 3. Testing Cron Watchdog (/cron/flag-overdue)");
        const cronRes = await axios.post(`${BASE_URL}/resolution/cron/flag-overdue`);
        console.log(`   -> API Response: ${cronRes.data.message}`);
        
        const checkTaskA = await Task.findById(taskA._id);
        if (checkTaskA.stage !== "requires_resolution") {
            throw new Error(`Cron failed: Task A stage is '${checkTaskA.stage}'`);
        }
        console.log("   ✅ Task A successfully flagged as 'requires_resolution'.");

        console.log("\n🤖 4. Testing AI Rescue & Graph Swap (/tasks/:id/approve-rescue)");
        
        // Call the approve endpoint (this inherently triggers the aiService payload on the backend)
        const approveRes = await axios.post(`${BASE_URL}/resolution/tasks/${taskA._id}/approve-rescue`, {}, authConfig);
        console.log(`   -> API Response: ${approveRes.data.message}`);

        // A. Assert Task A is archived
        const finalTaskA = await Task.findById(taskA._id);
        if (finalTaskA.stage !== "archived") throw new Error("Task A was not archived.");
        console.log("   ✅ Task A is now archived.");

        // B. Assert 3 new Rescue Tasks exist
        const rescueTasks = await Task.find({ isRescueTask: true, organizationId: testUser.organizationId }).sort({ startDate: 1 });
        if (rescueTasks.length !== 3) throw new Error(`Expected 3 rescue tasks, found ${rescueTasks.length}`);
        console.log("   ✅ 3 new Rescue Tasks exist and are sequentially linked.");

        // C. Assert Task B depends on Rescue Task 3
        const finalTaskB = await Task.findById(taskB._id);
        const finalRescue = rescueTasks[2];
        
        const hasNewDependency = finalTaskB.predecessors.some(id => id.toString() === finalRescue._id.toString());
        const hasOldDependency = finalTaskB.predecessors.some(id => id.toString() === taskA._id.toString());

        if (!hasNewDependency || hasOldDependency) {
            throw new Error("The Graph Swap failed! Task B does not depend exactly on the final rescue task.");
        }
        console.log(`   ✅ Task B's predecessors array now contains Rescue Task 3 [${finalRescue._id}] and original dependency was removed.`);

        // D. Assert Task B and Task C were shifted mathematically
        const finalTaskC = await Task.findById(taskC._id);
        console.log(`   -> Task B's initial Date: ${taskB.startDate.toDateString()}`);
        console.log(`   -> Task B's new Date:     ${finalTaskB.startDate.toDateString()}`);
        console.log(`   -> Task C's new Date:     ${finalTaskC.startDate.toDateString()}`);

        if (new Date(finalTaskB.startDate).getTime() <= new Date(taskB.startDate).getTime()) {
            throw new Error("Task B did not get shifted forward in time!");
        }
        console.log("   ✅ Task B and Task C had their startDate and endDate mathematically shifted forward (Self-Healing Engine worked).");

        console.log("\n🧹 5. Cleaning up Database...");
        const rescueIds = rescueTasks.map(t => t._id);
        await Task.deleteMany({ _id: { $in: [...testTasks, ...rescueIds] } });
        await User.findByIdAndDelete(testUser._id);
        console.log("   ✅ Test debris removed.");

        console.log("\n🎉 END-TO-END TEST SUITE PASSED SUCCESSFULLY! 🎉\n");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error.message);
        if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
        
        console.log("\n🧹 Cleaning up debris after failure...");
        if (testTasks.length > 0) await Task.deleteMany({ _id: { $in: testTasks } });
        if (testUser) await User.findByIdAndDelete(testUser._id);
        
        process.exit(1);
    }
}

runTests();
