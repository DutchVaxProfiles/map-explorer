import { z } from "zod";

export const colorSchemes = [
  "magma",
  "coolwarm"
] as const;
export type ColorScheme = (typeof colorSchemes)[number];

export const colorSchemeLabels: Record<ColorScheme, string> = {
  magma: "sequential",
  coolwarm: "divergent",
};

export const MapDescriptionSchema = z.object({
  title: z.string(),
  description: z.string(),
});
export type MapDescription = z.infer<typeof MapDescriptionSchema>;

export const MapColorConfigSchema = z.object({
  minValue: z.number(),
  maxValue: z.number(),
  numBins: z.number().int().positive().optional(),
  colorScheme: z.enum(colorSchemes).optional(),
  dynamic: z.boolean().optional(),
}).refine(
  v => v.minValue <= v.maxValue,
  { message: "minValue must be <= maxValue", path: ["minValue"] }
);
export type MapColorConfig = z.infer<typeof MapColorConfigSchema>;


export const MapConfigSchema = z.discriminatedUnion("kind", [
  // 1) GeoJSON only (UNSUPPORTED)
  //z.object({
  //  kind: z.literal("geojson-only"),
  //  mapDescription: MapDescriptionSchema,
  //  geojsonFileName: z.string(),
  //  idColumnGeojson: z.string(),
  //  legendTitle: z.string().optional(),
  //}),

  // 2) GeoJSON + external data file
  z.object({
    kind: z.literal("geojson-datafile"),
    mapDescription: MapDescriptionSchema,
    geojsonFileName: z.string(),
    dataFileName: z.string(),
    idColumnGeojson: z.string(),
    idColumnDataFile: z.string(),
    categoryColumns: z.array(z.string()),
    categoryLabels: z.record(z.string(), z.string()).optional(),
    categoryOptionLabels: z.record(z.string(), z.record(z.string(), z.string())).optional(),
    valueColumn: z.string(),
    legendTitle: z.string().optional(),
    mapColorConfig: MapColorConfigSchema,
    filter: z.record(z.string(), z.string()).optional(),
  }),
]);

export type MapConfig = z.infer<typeof MapConfigSchema>;
