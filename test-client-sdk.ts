import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";

async function test() {
  try {
    const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf-8"));
    console.log("Config:", config);
    
    const app = initializeApp(config);
    const db = getFirestore(app, config.firestoreDatabaseId);
    
    console.log("Attempting to fetch users collection with Client SDK...");
    const q = query(collection(db, "users"), limit(1));
    const snap = await getDocs(q);
    console.log("Success! Found", snap.size, "users.");
  } catch (error) {
    console.error("Client SDK Test Failed:");
    console.error(error);
  }
}

test();
