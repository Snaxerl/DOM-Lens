export type SelectorQuality = "stable" | "likely-stable" | "fragile";

export interface SelectorCandidate {
  value: string;
  quality: SelectorQuality;
  reason: string;
}

const cssEscape = (value: string): string => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/(^-?\d)|[^a-zA-Z0-9_-]/g, (match) => `\\${match}`);
};

const usefulClasses = (element: Element): string[] =>
  [...element.classList]
    .filter((name) => !/^(active|selected|hover|focus|open|show|hidden|ng-|css-|jsx-)/i.test(name))
    .filter((name) => name.length <= 48)
    .slice(0, 3);

export function uniqueInDocument(selector: string, documentRef: Document = document): boolean {
  try { return documentRef.querySelectorAll(selector).length === 1; } catch { return false; }
}

export function buildCssSelector(element: Element, documentRef: Document = document): SelectorCandidate {
  const id = element.id?.trim();
  if (id) {
    const selector = `#${cssEscape(id)}`;
    if (uniqueInDocument(selector, documentRef)) return { value: selector, quality: "stable", reason: "Unique id" };
  }

  const testIdAttributes = ["data-testid", "data-test", "data-cy", "data-qa"];
  for (const attribute of testIdAttributes) {
    const value = element.getAttribute(attribute)?.trim();
    if (!value) continue;
    const selector = `[${attribute}="${CSS.escape(value)}"]`;
    if (uniqueInDocument(selector, documentRef)) return { value: selector, quality: "stable", reason: `Unique ${attribute}` };
  }

  const name = element.getAttribute("name")?.trim();
  if (name) {
    const selector = `${element.localName}[name="${CSS.escape(name)}"]`;
    if (uniqueInDocument(selector, documentRef)) return { value: selector, quality: "likely-stable", reason: "Unique name attribute" };
  }

  const classes = usefulClasses(element);
  if (classes.length) {
    const selector = `${element.localName}.${classes.map(cssEscape).join(".")}`;
    if (uniqueInDocument(selector, documentRef)) return { value: selector, quality: "likely-stable", reason: "Unique semantic class combination" };
  }

  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current !== documentRef.documentElement && segments.length < 6) {
    let segment = current.localName;
    const currentClasses = usefulClasses(current);
    if (currentClasses.length) segment += `.${currentClasses.map(cssEscape).join(".")}`;
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter((child) => child.localName === current!.localName);
      if (siblings.length > 1) segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    segments.unshift(segment);
    const selector = segments.join(" > ");
    if (uniqueInDocument(selector, documentRef)) {
      const fragile = selector.includes(":nth-of-type");
      return { value: selector, quality: fragile ? "fragile" : "likely-stable", reason: fragile ? "Depends on sibling order" : "Unique DOM path" };
    }
    current = parent;
  }

  return { value: element.localName, quality: "fragile", reason: "Could not derive a unique selector" };
}

export function buildXPath(element: Element): string {
  if (element.id) return `//*[@id=${xpathLiteral(element.id)}]`;
  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const parent: Element | null = current.parentElement;
    if (!parent) { segments.unshift(current.localName); break; }
    const siblings = [...parent.children].filter((child) => child.localName === current!.localName);
    const index = siblings.indexOf(current) + 1;
    segments.unshift(`${current.localName}${siblings.length > 1 ? `[${index}]` : ""}`);
    current = parent;
  }
  return `/${segments.join("/")}`;
}

function xpathLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat('${value.replace(/'/g, `',"'",'`)}')`;
}
