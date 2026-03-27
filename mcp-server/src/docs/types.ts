export interface ParsedParam {
  name: string;
  type: string;
  default_value?: string;
}

export interface ParsedMethod {
  name: string;
  return_type: string;
  qualifiers: string;
  description: string;
  params: ParsedParam[];
}

export interface ParsedProperty {
  name: string;
  type: string;
  default_value: string;
  setter: string;
  getter: string;
  description: string;
}

export interface ParsedSignal {
  name: string;
  description: string;
  params: ParsedParam[];
}

export interface ParsedConstant {
  name: string;
  value: string;
  enum_name: string;
  description: string;
}

export interface ParsedClass {
  name: string;
  inherits: string;
  brief_description: string;
  description: string;
  methods: ParsedMethod[];
  properties: ParsedProperty[];
  signals: ParsedSignal[];
  constants: ParsedConstant[];
}

export interface SearchResult {
  symbol_name: string;
  class_name: string;
  kind: string;
  description: string;
}

export interface ClassReference {
  name: string;
  inherits: string;
  brief_description: string;
  description: string;
  methods: Array<{
    name: string;
    return_type: string;
    qualifiers: string;
    description: string;
    params: ParsedParam[];
  }>;
  properties: Array<{
    name: string;
    type: string;
    default_value: string;
    description: string;
  }>;
  signals: Array<{
    name: string;
    description: string;
    params: ParsedParam[];
  }>;
  constants: Array<{
    name: string;
    value: string;
    enum_name: string;
    description: string;
  }>;
}
