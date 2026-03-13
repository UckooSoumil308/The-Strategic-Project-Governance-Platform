import fetch from "node-fetch";

async function testApprove() {
    try {
        const response = await fetch("http://localhost:8800/api/task/65a123f4b67c8d90e1234567/approve", {
            method: "PATCH",
            headers: {
                "x-n8n-api-key": "super_secure_n8n_key_123"
            }
        });

        const data = await response.json().catch(() => null);
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log("Body:", data);
    } catch (error) {
        console.error("Fetch failed:", error.message);
    }
}

testApprove();
