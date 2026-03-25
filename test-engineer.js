import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dronefix-secret-key-change-in-production";

// Create a valid token for Prashant (engineer)
// Assuming user ID 2 or something since I don't know his ID, but let's try calling auth/login first
async function test() {
  try {
    const res = await fetch("https://dronfix.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "prashant@dronefix.com", password: "password123" }) 
    });
    
    if (!res.ok) {
      console.log("Login HTTP", res.status, await res.text());
      return;
    }
    
    const data = await res.json();
    console.log("Logged in:", data.user);
    
    const reqRes = await fetch("https://dronfix.onrender.com/api/service-requests/6", {
      headers: { "Authorization": `Bearer ${data.token}` }
    });
    
    if (!reqRes.ok) {
      console.log("Req HTTP", reqRes.status, await reqRes.text());
    } else {
      console.log("Req HTTP 200 OK");
      const reqData = await reqRes.json();
      console.log("Got request:", reqData.id);
    }
  } catch(e) {
    console.error(e);
  }
}
test();
