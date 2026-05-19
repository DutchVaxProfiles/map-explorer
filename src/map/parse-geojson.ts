import { check } from "@placemarkio/check-geojson"
import { ZodError } from "zod"

export function parseGeojson(geojsonString: string) {
  try {
    check(geojsonString)
    const parsedGeojson = JSON.parse(geojsonString)

    return {
      valid: true,
      geojson: parsedGeojson,
      errors: null as string | null,
    }
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return {
        valid: false,
        geojson: null,
        errors: e.issues.map(issue => issue.message).join(" "),
      }
    }
  }
}
