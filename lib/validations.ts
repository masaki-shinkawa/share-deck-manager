import { z } from "zod";

export const deckSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  recipe_url: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type DeckFormData = z.infer<typeof deckSchema>;
