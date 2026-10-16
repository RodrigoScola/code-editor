export interface ParameterInformation {
  // the text, or [start, end) offsets into the signature's label
  label: string | [number, number];
  documentation?: string;
}

export interface SignatureInformation {
  label: string;
  parameters?: ParameterInformation[];
  // wins over SignatureHelp.activeParameter
  activeParameter?: number;
  documentation?: string;
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

// the parameter to highlight, and where it is in the signature's label
export function activeSignatureParameter(
  help: SignatureHelp,
): { label: string; start: number; end: number } | undefined {
  throw new Error("not implemented");
}
