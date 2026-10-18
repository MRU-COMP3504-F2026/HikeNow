"use server";
import { db } from "@/app/db/index"
import { eq } from "drizzle-orm";
import { hike } from "@/app/db/schema";

export async function getHikeById(id: string) {
  const currentHike = await db.select().from(hike).where(eq(hike.id, id))
  if (currentHike.length == 0) return null;
  return currentHike[0];
}

export async function getHikeByName(name: string) {
  return db.select().from(hike).where(eq(hike.name, name))
}

export async function createHike(name: string, description: string, difficulty: string, lenght: number, equipment: string[], location: string, rating: number, landmarks: string[]) {
    const result = await db.insert(hike).values({ 
        name: name,
        description: description,
        difficulty: difficulty,
        lenght: lenght, 
        equipment: equipment,
        location: location,
        rating: rating,
        landmarks: landmarks,
      })
      .returning(); 
  return { success: true, returnHike: result[0] };
}