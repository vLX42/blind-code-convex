import React, { useState, useEffect, useRef } from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/theme-vibrant_ink";
import "ace-builds/src-noconflict/ext-emmet";
import "ace-builds/src-noconflict/ext-language_tools";

// Import emmet and attach to window for ace-emmet extension
import emmet from "emmet-core";
if (typeof window !== "undefined") {
  (window as Window & { emmet?: typeof emmet }).emmet = emmet;
}

export interface EditorProps {
  onChange?: (newValue: string) => void;
  defaultValue?: string | null;
  className: string;
}

export const Editor = ({
  onChange,
  defaultValue,
  className,
  ...props
}: EditorProps) => {
  const [editorValue, setEditorValue] = useState(defaultValue || "");
  const editorRef = useRef<AceEditor>(null);

  // Enable Emmet after editor mounts
  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current.editor;
      if (editor) {
        editor.setOption("enableEmmet", true);
      }
    }
  }, []);

  const update = (value: string) => {
    setEditorValue(value);
    onChange && onChange(value);
  };

  return (
    <AceEditor
      ref={editorRef}
      className={className}
      mode="html"
      theme="vibrant_ink"
      onChange={update}
      height="calc(100vh - 10px)"
      width="100%"
      value={editorValue}
      editorProps={{ $blockScrolling: Infinity }}
      enableBasicAutocompletion
      enableLiveAutocompletion
      tabSize={2}
      fontSize={22}
      {...props}
    />
  );
};
