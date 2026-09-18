import { getAccessibleName, getRole } from "./accessibility";

const quote = (value: string): string => JSON.stringify(value);

export function buildPlaywrightLocator(element: Element, cssSelector: string): string {
  const testId = element.getAttribute("data-testid")?.trim();
  if (testId) return `page.getByTestId(${quote(testId)})`;
  const role = getRole(element);
  const name = getAccessibleName(element);
  const supportedRoles = new Set(["button", "link", "checkbox", "radio", "textbox", "combobox", "heading", "img"]);
  if (role && name && supportedRoles.has(role)) return `page.getByRole(${quote(role)}, { name: ${quote(name)} })`;
  if (element instanceof HTMLInputElement && element.placeholder.trim()) return `page.getByPlaceholder(${quote(element.placeholder.trim())})`;
  return `page.locator(${quote(cssSelector)})`;
}
