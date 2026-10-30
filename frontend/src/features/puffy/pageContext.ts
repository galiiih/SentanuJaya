import { useEffect } from "react";
import type { PageContext } from "./types";

let current: PageContext["entity"];

export const getPuffyEntity = () => current;

/**
 * Opsional: panggil di halaman detail agar Puffy tahu record yang sedang dibuka.
 * Contoh: usePuffyEntity({ type: "delivery_order", id: order.id })
 */
export function usePuffyEntity(entity?: PageContext["entity"]) {
  const type = entity?.type;
  const id = entity?.id;
  useEffect(() => {
    current = type !== undefined && id !== undefined ? { type, id } : undefined;
    return () => { current = undefined; };
  }, [type, id]);
}
