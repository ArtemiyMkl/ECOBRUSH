import { readFile } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "src/lib/ozon/fixtures");

/** Bewusst zur Laufzeit gelesen statt statisch importiert: ein `import` der
 *  350-KB-Produktdatei würde TypeScript einen riesigen Literaltyp herleiten
 *  lassen und die Typprüfung ausbremsen. */
export async function loadFixture<T>(name: string): Promise<T> {
  return JSON.parse(await readFile(path.join(DIR, name), "utf8")) as T;
}

export async function loadFixtureText(name: string): Promise<string> {
  return readFile(path.join(DIR, name), "utf8");
}
