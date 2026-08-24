// Validation for jet ski create/update payloads (all money already in cents).
export type SkiInput = {
  name: string;
  model: string;
  horsepower: number;
  seats: number;
  description: string;
  imageUrl: string;
  hourlyRate: number;
  halfDayRate: number;
  fullDayRate: number;
  weekendRate: number;
  depositAmount: number;
  unitCount: number;
  featured: boolean;
  active: boolean;
};

export function parseSkiInput(
  body: Record<string, unknown>
): { data: SkiInput } | { error: string } {
  const str = (k: string) =>
    typeof body[k] === "string" ? (body[k] as string).trim() : "";
  const name = str("name");
  const model = str("model");
  const description = str("description");
  const imageUrl = str("imageUrl");
  if (!name || !model || !description || !imageUrl) {
    return { error: "Name, model, description and image URL are required." };
  }

  const posInt = (k: string): number | null => {
    const v = body[k];
    return typeof v === "number" && Number.isInteger(v) && v > 0 ? v : null;
  };
  const horsepower = posInt("horsepower");
  const seats = posInt("seats");
  const hourlyRate = posInt("hourlyRate");
  const halfDayRate = posInt("halfDayRate");
  const fullDayRate = posInt("fullDayRate");
  const weekendRate = posInt("weekendRate");
  const depositAmount = posInt("depositAmount");
  const unitCount = posInt("unitCount");
  if (
    horsepower === null ||
    seats === null ||
    hourlyRate === null ||
    halfDayRate === null ||
    fullDayRate === null ||
    weekendRate === null ||
    depositAmount === null ||
    unitCount === null
  ) {
    return {
      error:
        "Horsepower, seats, max jet skis per booking and all prices must be positive integers (prices in cents).",
    };
  }

  return {
    data: {
      name,
      model,
      description,
      imageUrl,
      horsepower,
      seats,
      hourlyRate,
      halfDayRate,
      fullDayRate,
      weekendRate,
      depositAmount,
      unitCount,
      featured: body.featured === true,
      active: body.active !== false,
    },
  };
}
