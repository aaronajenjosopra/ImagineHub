import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

async function test() {
  try {
    console.log("Initializing with NO arguments...");
    admin.initializeApp();
    const db = getFirestore();
    console.log("Attempting to fetch users from (default) database...");
    const snap = await db.collection("users").limit(1).get();
    console.log("Success! Found", snap.size, "users.");
  } catch (error) {
    console.error("Default Test Failed:");
    console.error(error);
  }
}

test();
