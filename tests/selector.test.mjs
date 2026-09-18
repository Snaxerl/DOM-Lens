import test from "node:test";
import assert from "node:assert/strict";
import { buildCssSelector } from "../.build/core/selector.js";

globalThis.Node = { ELEMENT_NODE: 1 };
globalThis.CSS = { escape: (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) };
function fakeElement({id="",name="",tag="button",classes=[]}={}) {
  const attrs = new Map(name ? [["name",name]] : []);
  return { id, localName:tag, classList:classes, parentElement:null, getAttribute(key){return attrs.get(key)??null;} };
}
test("prefers a unique id",()=>{
  const element=fakeElement({id:"save-button"});
  const documentRef={documentElement:{},querySelectorAll(selector){return selector==="#save-button"?[element]:[];}};
  assert.deepEqual(buildCssSelector(element,documentRef),{value:"#save-button",quality:"stable",reason:"Unique id"});
});
test("falls back to a unique name attribute",()=>{
  const element=fakeElement({name:"email",tag:"input"});
  const documentRef={documentElement:{},querySelectorAll(selector){return selector==='input[name="email"]'?[element]:[];}};
  assert.equal(buildCssSelector(element,documentRef).quality,"likely-stable");
});
