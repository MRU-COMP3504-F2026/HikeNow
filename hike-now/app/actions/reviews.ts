"use server";

import { promises as fs } from "fs";
import path from "path";

export async function saveReviewToFile(newReview: Record<string, unknown>) {
  try {
    // Ruta en la carpeta temporal de servidor (escribible)
    const tmpPath = path.join("/tmp", "reviews.json");
    
    // Ruta del archivo original con los datos sembrados (seed)
    const seedPath = path.join(process.cwd(), "temporary_data", "reviews.json");

    let reviews = [];

    try {
      // 1. Intentar leer el archivo guardado previamente en /tmp
      const fileData = await fs.readFile(tmpPath, "utf-8");
      reviews = JSON.parse(fileData);
    } catch {
      // 2. Si /tmp/reviews.json aún no existe, clonamos los datos del original
      try {
        const seedData = await fs.readFile(seedPath, "utf-8");
        reviews = JSON.parse(seedData);
      } catch {
        // Si el original tampoco existe, iniciamos array vacío
        reviews = [];
      }
    }

    // 3. Agregar la nueva reseña al conjunto existente
    reviews.push(newReview);

    // 4. Guardar el archivo actualizado en /tmp
    await fs.writeFile(tmpPath, JSON.stringify(reviews, null, 2), "utf-8");
    // Al final de saveReviewToFile, justo antes de return { success: true }:
    const savedContent = await fs.readFile(tmpPath, "utf-8");
    console.log("--- CONTENIDO ACTUAL EN /tmp/reviews.json ---");
    console.log(savedContent);
    return { success: true };
  } catch (error) {
    console.error("Error writing to JSON file:", error);
    return { success: false, error: "Failed to save review" };
  }
}