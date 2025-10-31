import { createContext } from "react";

interface DocumentContextType {
  onload: Record<string, any>;
}
const DocumentContext = createContext<DocumentContextType>({ onload: {} });

export default DocumentContext;
