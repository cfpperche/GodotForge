import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "fs";
import type {
  ParsedClass,
  ParsedMethod,
  ParsedProperty,
  ParsedSignal,
  ParsedConstant,
  ParsedParam,
} from "./types.js";

// Interfaces for XML-parsed nodes from fast-xml-parser
interface XmlNode {
  "@_name"?: string;
  "@_type"?: string;
  "@_default"?: string;
  "@_value"?: string;
  "@_enum"?: string;
  "@_qualifiers"?: string;
  "@_inherits"?: string;
  "@_setter"?: string;
  "@_getter"?: string;
  description?: unknown;
  return?: { "@_type"?: string };
  param?: unknown[];
  constant?: unknown[] | unknown;
  "#text"?: string;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  isArray: (name) =>
    ["method", "member", "signal", "constant", "param", "link", "ctor"].includes(name),
  allowBooleanAttributes: true,
  processEntities: false,
  htmlEntities: true,
});

export function parseClassXml(filePath: string): ParsedClass {
  // Rename <constructor> tags to avoid fast-xml-parser's prototype pollution protection
  const rawXml = readFileSync(filePath, "utf-8");
  const xml = rawXml
    .replace(/<constructor /g, "<ctor ")
    .replace(/<\/constructor>/g, "</ctor>")
    .replace(/<constructors>/g, "<ctors>")
    .replace(/<\/constructors>/g, "</ctors>");
  const parsed = xmlParser.parse(xml);
  const cls = parsed.class;

  if (!cls) {
    throw new Error(`No <class> element found in ${filePath}`);
  }

  return {
    name: cls["@_name"] || "",
    inherits: cls["@_inherits"] || "",
    brief_description: extractText(cls.brief_description),
    description: extractText(cls.description),
    methods: [
      ...parseMethods(cls.methods?.method),
      ...parseMethods(cls.ctors?.ctor),
    ],
    properties: parseProperties(cls.members?.member),
    signals: parseSignals(cls.signals?.signal),
    constants: parseConstants(cls.constants?.constant, cls.constants?.enum),
  };
}

function extractText(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node.trim();
  if (typeof node === "object" && node !== null && "#text" in node) {
    return String((node as Record<string, unknown>)["#text"]).trim();
  }
  return "";
}

function parseMethods(methods: unknown[] | undefined): ParsedMethod[] {
  if (!methods) return [];
  return (methods as XmlNode[]).map((m) => ({
    name: m["@_name"] || "",
    return_type: m.return?.["@_type"] || "void",
    qualifiers: m["@_qualifiers"] || "",
    description: extractText(m.description),
    params: parseParams(m.param),
  }));
}

function parseProperties(members: unknown[] | undefined): ParsedProperty[] {
  if (!members) return [];
  return (members as XmlNode[]).map((m) => ({
    name: m["@_name"] || "",
    type: m["@_type"] || "",
    default_value: m["@_default"] || "",
    setter: m["@_setter"] || "",
    getter: m["@_getter"] || "",
    description: extractText(m.description || m),
  }));
}

function parseSignals(signals: unknown[] | undefined): ParsedSignal[] {
  if (!signals) return [];
  return (signals as XmlNode[]).map((s) => ({
    name: s["@_name"] || "",
    description: extractText(s.description),
    params: parseParams(s.param),
  }));
}

function parseConstants(
  constants: unknown[] | undefined,
  enums: unknown[] | undefined
): ParsedConstant[] {
  const result: ParsedConstant[] = [];

  if (constants) {
    for (const c of constants as XmlNode[]) {
      result.push({
        name: c["@_name"] || "",
        value: c["@_value"] || "",
        enum_name: c["@_enum"] || "",
        description: extractText(c.description || c),
      });
    }
  }

  if (enums) {
    const enumList = Array.isArray(enums) ? enums : [enums];
    for (const e of enumList as XmlNode[]) {
      const enumName = e["@_name"] || "";
      const enumConstants = e.constant
        ? Array.isArray(e.constant)
          ? e.constant
          : [e.constant]
        : [];
      for (const c of enumConstants as XmlNode[]) {
        result.push({
          name: c["@_name"] || "",
          value: c["@_value"] || "",
          enum_name: enumName,
          description: extractText(c.description || c),
        });
      }
    }
  }

  return result;
}

function parseParams(params: unknown[] | undefined): ParsedParam[] {
  if (!params) return [];
  return (params as XmlNode[]).map((p) => ({
    name: p["@_name"] || "",
    type: p["@_type"] || "",
    default_value: p["@_default"] || undefined,
  }));
}
