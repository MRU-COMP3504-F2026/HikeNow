import { promises as fs } from "fs";
import path from "path";

export async function saveReviewToFile(newReview: Record<string, unknown>) {
  try {
    // process.cwd() obtiene la ruta absoluta del directorio raíz de tu proyecto
    const filePath = path.join(process.cwd(), "temporary_data", "reviews.json");
    // (O usa path.join(process.cwd(), "..", "temporary_data", "reviews.json") si está fuera de la raíz)

    const dirPath = path.dirname(filePath);

    // 1. Asegurar que la carpeta exista antes de escribir
    await fs.mkdir(dirPath, { recursive: true });

    // 2. Leer las reseñas existentes
    let reviews = [];
    try {
      const fileData = await fs.readFile(filePath, "utf-8");
      reviews = JSON.parse(fileData);
    } catch {
      reviews = [];
    }

    // 3. Agregar y guardar
    reviews.push(newReview);
    await fs.writeFile(filePath, JSON.stringify(reviews, null, 2), "utf-8");

    return { success: true };
  } catch (error) {
    console.error("Error writing to JSON file:", error);
    return { success: false, error: "Failed to save review" };
  }
}