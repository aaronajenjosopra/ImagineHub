import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

async function test() {
  try {
    const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
    console.log("Config:", config);
    
    admin.initializeApp({
      projectId: config.projectId,
    });
    
    const dbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)" 
      ? config.firestoreDatabaseId 
      : undefined;
      
    const db = getFirestore(dbId);
    console.log("Attempting to fetch users collection...");
    const snap = await db.collection("users").limit(1).get();
    console.log("Success! Found", snap.size, "users.");
  } catch (error) {
    console.error("Test Failed:");
    console.error(error);
  }
}

test();
