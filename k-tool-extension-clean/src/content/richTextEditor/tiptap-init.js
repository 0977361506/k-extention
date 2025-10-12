/**
 * TipTap Initialization Module
 * This file is built by webpack and loaded as tiptap.js in the content script
 * It exposes TipTap modules to the global scope for use in content scripts
 */

// Import TipTap core and extensions
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Underline } from "@tiptap/extension-underline";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";

// Import TipTapEditor class
import { TipTapEditor } from "./TipTapEditor.js";

// 🔧 Expose TipTap modules to global scope for content script access
if (typeof window !== "undefined") {
  window.TipTapModules = {
    Editor,
    StarterKit,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    Image,
    Link,
    TextAlign,
    Color,
    TextStyle,
    FontFamily,
    Underline,
    Subscript,
    Superscript,
  };

  // Also expose the TipTapEditor class
  window.TipTapEditor = TipTapEditor;

  console.log("✅ TipTap modules and TipTapEditor exposed to global scope");
}

// Export for module usage
export {
  Editor,
  StarterKit,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  Image,
  Link,
  TextAlign,
  Color,
  TextStyle,
  FontFamily,
  Underline,
  Subscript,
  Superscript,
  TipTapEditor,
};
