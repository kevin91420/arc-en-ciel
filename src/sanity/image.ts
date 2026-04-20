import imageUrlBuilder from "@sanity/image-url";
import { client } from "./client";

const builder = imageUrlBuilder(client);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function urlFor(source: any) {
  return builder.image(source);
}

/** True si le champ image Sanity peut être passé à urlFor(). */
export function isSanityImageRef(image: unknown): image is Parameters<
  typeof urlFor
>[0] {
  return (
    typeof image === "object" &&
    image !== null &&
    "asset" in image &&
    typeof (image as { asset?: { _ref?: string } }).asset === "object" &&
    Boolean((image as { asset?: { _ref?: string } }).asset?._ref)
  );
}
