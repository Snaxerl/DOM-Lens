import { accessibilityChecks, getAccessibleName, getRole } from "./accessibility";
import { buildCssSelector, buildXPath } from "./selector";
import { buildPlaywrightLocator } from "./playwright";

export interface ElementSnapshot {
  tag: string; text: string; role: string; accessibleName: string; id: string; classes: string[];
  selector: ReturnType<typeof buildCssSelector>; xpath: string; playwright: string;
  attributes: Array<{name:string; value:string}>; rect: {x:number;y:number;width:number;height:number};
  styles: Record<string,string>; box: {margin:string;padding:string;border:string};
  checks: ReturnType<typeof accessibilityChecks>; breadcrumbs: Array<{tag:string; id:string; classes:string[]}>;
}

const cleanText = (value: string): string => value.replace(/\s+/g, " ").trim().slice(0, 220);

export function inspectElement(element: Element): ElementSnapshot {
  const selector = buildCssSelector(element, element.ownerDocument);
  const computed = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const styles = Object.fromEntries([
    "display", "position", "color", "background-color", "font-family", "font-size", "font-weight",
    "line-height", "text-align", "opacity", "z-index", "overflow", "border-radius"
  ].map((property) => [property, computed.getPropertyValue(property).trim()]));
  const breadcrumbs: ElementSnapshot["breadcrumbs"] = [];
  let node: Element | null = element;
  while (node && breadcrumbs.length < 8) {
    breadcrumbs.unshift({tag:node.localName, id:node.id, classes:[...node.classList].slice(0,2)});
    node = node.parentElement;
  }
  return {
    tag: element.localName,
    text: cleanText(element.textContent ?? ""),
    role: getRole(element),
    accessibleName: getAccessibleName(element),
    id: element.id,
    classes: [...element.classList],
    selector,
    xpath: buildXPath(element),
    playwright: buildPlaywrightLocator(element, selector.value),
    attributes: [...element.attributes].map((attribute) => ({name:attribute.name,value:attribute.value})),
    rect: {x:rect.x,y:rect.y,width:rect.width,height:rect.height},
    styles,
    box: {
      margin: [computed.marginTop,computed.marginRight,computed.marginBottom,computed.marginLeft].join(" "),
      padding: [computed.paddingTop,computed.paddingRight,computed.paddingBottom,computed.paddingLeft].join(" "),
      border: [computed.borderTopWidth,computed.borderRightWidth,computed.borderBottomWidth,computed.borderLeftWidth].join(" ")
    },
    checks: accessibilityChecks(element), breadcrumbs
  };
}
