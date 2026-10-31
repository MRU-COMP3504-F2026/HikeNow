"use server";

import { promises as fs } from "fs";
import path from "path";

export async function saveReviewToFile(reviewData: Record<string, unknown>) {
  try {
    // Apunta a la ruta ../temporary_data/reviews.json relativa a la raíz del proyecto
    const filePath = path.join(process.cwd(), "..", "temporary_data", "reviews.json");

    // 1. Leer las reseñas existentes si el archivo ya existe
    let reviews = [];
    try {
      const fileData = await fs.readFile(filePath, "utf-8");
      reviews = JSON.parse(fileData);
    } catch {
      // Si el archivo no existe o está vacío, iniciamos un array nuevo
      reviews = [];
    }

    // 2. Agregar la nueva reseña con un ID único y fecha
    reviews.push({
      id: crypto.randomUUID(),
      ...reviewData,
      createdAt: new Date().toISOString(),
    });

    // 3. Crear el directorio si no existe
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 4. Escribir los datos formateados en el archivo JSON
    await fs.writeFile(filePath, JSON.stringify(reviews, null, 2), "utf-8");

    return { success: true };
  } catch (error) {
    console.error("Error writing to JSON file:", error);
    return { success: false, error: "Failed to save review" };
  }
}