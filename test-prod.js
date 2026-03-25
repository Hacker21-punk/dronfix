import jwt from "jsonwebtoken";

const JWT_SECRET = "dronefix-secret-key-change-in-production";

async function test() {
  const token = jwt.sign({ userId: 2, role: "engineer" }, JWT_SECRET, { expiresIn: "7d" });
  
  const res = await fetch("https://dronfix.onrender.com/api/service-requests/6", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!res.ok) {
    console.log("Req HTTP", res.status, await res.text());
  } else {
    console.log("Req HTTP 200 OK", (await res.json()).id);
  }
}
test();
