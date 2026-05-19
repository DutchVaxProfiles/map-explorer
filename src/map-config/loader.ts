import { MapConfigSchema } from "./types.ts"
import type { MapConfig } from "./types.ts"


const jsonModules = import.meta.glob("./map-configs/!(_)*.json", {
  eager: true
})


type RawJsonModule = { default: unknown }

export function validateMapConfig(input: unknown): MapConfig {
  const result = MapConfigSchema.safeParse(input)

  if (result.success) {
    console.log(`[App Config Validator] parsed ${result.data.kind} config`)
    return Object.freeze(result.data)
  }

  const errors = result.error.issues.map(iss => {
    const path = iss.path.length ? ` at ${iss.path.join(".")}` : ""
    return `${iss.message}${path}`
  })

  throw new Error(["Invalid AppConfig:", ...errors.map(e => ` - ${e}`)].join("\n"))
}


export const mapConfigs: MapConfig[] = Object.values(jsonModules).map(
  (mod) => validateMapConfig((mod as RawJsonModule).default)
)
