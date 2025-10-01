import React from "react";
import { createRoot } from "react-dom/client";
import PopupSettings from "./PopupSettings";
import '../utils/UIInit.js';

function init() {
    const appContainer = document.createElement('div')
    document.body.appendChild(appContainer)
    const root = createRoot(appContainer)
    root.render(<PopupSettings />);
}

init();
