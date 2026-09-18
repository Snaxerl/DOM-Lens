export interface AccessibilityCheck { status: "pass" | "warning" | "info"; label: string; detail?: string; }

export function getAccessibleName(element: Element): string {
  const aria = element.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const labelledBy = element.getAttribute("aria-labelledby")?.trim();
  if (labelledBy) {
    const text = labelledBy.split(/\s+/).map((id) => element.ownerDocument.getElementById(id)?.textContent?.trim() ?? "").filter(Boolean).join(" ");
    if (text) return text;
  }
  if (element instanceof HTMLImageElement) return element.alt.trim();
  if (element instanceof HTMLInputElement) {
    const label = element.labels?.[0]?.textContent?.trim();
    if (label) return label;
    if (["button", "submit", "reset"].includes(element.type) && element.value.trim()) return element.value.trim();
  }
  return (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
}

export function getRole(element: Element): string {
  const explicit = element.getAttribute("role")?.trim();
  if (explicit) return explicit;
  if (element instanceof HTMLButtonElement) return "button";
  if (element instanceof HTMLAnchorElement && element.hasAttribute("href")) return "link";
  if (element instanceof HTMLImageElement) return "img";
  if (element instanceof HTMLTextAreaElement) return "textbox";
  if (element instanceof HTMLSelectElement) return "combobox";
  if (element instanceof HTMLInputElement) {
    if (["checkbox", "radio", "button", "submit", "reset"].includes(element.type)) return element.type === "submit" || element.type === "reset" ? "button" : element.type;
    return "textbox";
  }
  if (/^h[1-6]$/.test(element.localName)) return "heading";
  return "";
}

export function accessibilityChecks(element: Element): AccessibilityCheck[] {
  const checks: AccessibilityCheck[] = [];
  const name = getAccessibleName(element);
  const role = getRole(element);
  const interactive = ["button", "link", "textbox", "checkbox", "radio", "combobox"].includes(role);
  if (interactive) checks.push(name ? {status:"pass", label:"Accessible name", detail:name} : {status:"warning", label:"Missing accessible name"});
  if (element instanceof HTMLImageElement) checks.push(element.alt.trim() ? {status:"pass", label:"Image has alt text"} : {status:"warning", label:"Image is missing alt text"});
  if (element instanceof HTMLInputElement && !["hidden", "button", "submit", "reset"].includes(element.type)) {
    const hasLabel = Boolean(element.labels?.length) || Boolean(element.getAttribute("aria-label")) || Boolean(element.getAttribute("aria-labelledby"));
    checks.push(hasLabel ? {status:"pass", label:"Form control has a label"} : {status:"warning", label:"Form control has no associated label"});
  }
  const tabIndex = (element as HTMLElement).tabIndex;
  if (interactive) checks.push(tabIndex >= 0 ? {status:"pass", label:"Keyboard focusable"} : {status:"warning", label:"Not keyboard focusable"});
  if (!checks.length) checks.push({status:"info", label:"No basic issues detected for this element"});
  return checks;
}
